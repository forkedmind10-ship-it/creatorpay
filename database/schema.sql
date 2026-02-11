-- CreatorPay Database Schema
-- PostgreSQL database for creator micropayment platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_crypto";

-- Creators table
CREATE TABLE creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address
    content_types JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['articles', 'newsletters', 'research', 'code']
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['substack', 'medium', 'twitter', 'github']
    bio TEXT,
    website VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content table
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Full content (protected by paywall)
    excerpt TEXT NOT NULL, -- Free preview
    content_type VARCHAR(50) NOT NULL, -- 'article', 'newsletter', 'research', 'code'
    price_usd DECIMAL(10,6) NOT NULL, -- Price in USD (e.g., 0.050000 for 5 cents)
    tags JSONB DEFAULT '[]'::jsonb, -- Searchable tags
    metadata JSONB DEFAULT '{}'::jsonb, -- Extra metadata (word count, difficulty, etc.)
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    tx_hash VARCHAR(66) UNIQUE NOT NULL, -- Transaction hash on Base L2
    amount_usd DECIMAL(10,6) NOT NULL, -- Total amount paid
    creator_amount VARCHAR(20) NOT NULL, -- Amount creator received (80% in USDC units)
    platform_fee VARCHAR(20) NOT NULL, -- Platform fee (20% in USDC units)
    chain_id INTEGER DEFAULT 8453, -- Base L2 chain ID
    token_address VARCHAR(42) DEFAULT '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', -- USDC on Base
    block_number BIGINT,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table (for tracking access patterns)
CREATE TABLE content_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    agent_type VARCHAR(50), -- 'claude', 'openai', 'cursor', etc.
    ip_address INET,
    user_agent TEXT,
    access_type VARCHAR(20) CHECK (access_type IN ('preview', 'full_access')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment requests table (for tracking 402 responses)
CREATE TABLE payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    creator_wallet VARCHAR(42) NOT NULL,
    amount_usd DECIMAL(10,6) NOT NULL,
    amount_usdc VARCHAR(20) NOT NULL, -- Amount in USDC units (6 decimals)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creator earnings summary (materialized view for performance)
CREATE MATERIALIZED VIEW creator_earnings AS
SELECT 
    c.id as creator_id,
    c.username,
    COUNT(DISTINCT co.id) as total_content,
    COUNT(p.id) as total_payments,
    SUM(p.amount_usd) as total_revenue_usd,
    SUM(p.creator_amount::numeric) / 1000000 as total_earned_usdc, -- Convert from USDC units
    AVG(p.amount_usd) as avg_payment_usd,
    MAX(p.created_at) as last_payment_at,
    COUNT(CASE WHEN p.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as payments_last_30d,
    SUM(CASE WHEN p.created_at > NOW() - INTERVAL '30 days' THEN p.amount_usd ELSE 0 END) as revenue_last_30d
FROM creators c
LEFT JOIN content co ON c.id = co.creator_id AND co.status = 'active'
LEFT JOIN payments p ON co.id = p.content_id AND p.status = 'confirmed'
WHERE c.status = 'active'
GROUP BY c.id, c.username;

-- Indexes for performance
CREATE INDEX idx_creators_username ON creators(username);
CREATE INDEX idx_creators_wallet ON creators(wallet_address);
CREATE INDEX idx_creators_status ON creators(status);

CREATE INDEX idx_content_creator_id ON content(creator_id);
CREATE INDEX idx_content_type ON content(content_type);
CREATE INDEX idx_content_price ON content(price_usd);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_created_at ON content(created_at DESC);
CREATE INDEX idx_content_search ON content USING GIN (to_tsvector('english', title || ' ' || excerpt));

CREATE INDEX idx_payments_content_id ON payments(content_id);
CREATE INDEX idx_payments_creator_id ON payments(creator_id);
CREATE INDEX idx_payments_tx_hash ON payments(tx_hash);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);

CREATE INDEX idx_content_access_content_id ON content_access(content_id);
CREATE INDEX idx_content_access_created_at ON content_access(created_at DESC);

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON creators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO creators (username, email, wallet_address, content_types, platforms, bio) VALUES
('cryptowriter', 'crypto@writer.com', '0x742d35Cc6354C1532265331e8b8F6Cf0c3e7c3E', 
 '["articles", "newsletters"]', '["substack", "twitter"]', 
 'Writing about crypto, DeFi, and the future of money.'),
('airesearcher', 'ai@researcher.com', '0x8ba1f109551bD432803012645Hac136c421Ba25F', 
 '["research", "articles"]', '["medium", "github"]', 
 'AI researcher focused on agent economics and coordination.');

INSERT INTO content (creator_id, title, content, excerpt, content_type, price_usd, tags) VALUES
((SELECT id FROM creators WHERE username = 'cryptowriter'), 
 'The Future of Creator Payments', 
 'Full article content about how micropayments will revolutionize creator monetization...', 
 'A deep dive into how blockchain micropayments could solve the creator economy crisis...', 
 'article', 0.05, '["payments", "creators", "blockchain"]'),
((SELECT id FROM creators WHERE username = 'airesearcher'), 
 'Agent Economic Models Research', 
 'Comprehensive research on how AI agents will handle economic transactions...', 
 'This research explores various economic models for AI agent interactions...', 
 'research', 0.08, '["ai", "economics", "agents"]');

-- Refresh materialized view
REFRESH MATERIALIZED VIEW creator_earnings;