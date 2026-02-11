# CreatorPay Deployment Guide

## Quick Start

### 1. Setup Database
```bash
# Install PostgreSQL
brew install postgresql
createdb creatorpay

# Run schema
psql creatorpay < database/schema.sql
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Create .env file
cp .env.example .env

# Configure:
DB_HOST=localhost
DB_NAME=creatorpay
DB_USER=postgres
DB_PASSWORD=yourpassword

# Base L2 RPC (for payment verification)
BASE_RPC_URL=https://mainnet.base.org

# Platform wallet (receives 20% fees)
PLATFORM_WALLET=0x...
```

### 4. Start Server
```bash
npm run dev
```

Server runs on http://localhost:3000

## API Endpoints

### Creator Management
- `POST /api/v1/creators` - Onboard new creator
- `GET /api/v1/creators/:username` - Get creator profile
- `GET /api/v1/creators/:username/analytics` - Creator analytics

### Content Management  
- `POST /api/v1/content` - Upload content
- `GET /api/v1/content/:id` - Access content (with payment)
- `GET /api/v1/content` - Search content

### System
- `GET /health` - Health check
- `GET /api/v1/stats` - Platform statistics

## MCP Integration (AI Agents)

### Claude Desktop Setup
```json
{
  "mcpServers": {
    "creatorpay": {
      "command": "node",
      "args": ["./src/mcp/creatorMCPServer.js"],
      "env": {
        "API_BASE": "http://localhost:3000"
      }
    }
  }
}
```

### OpenClaw Setup
Similar MCP configuration in your OpenClaw agent settings.

## Testing

### 1. Create Test Creator
```bash
curl -X POST http://localhost:3000/api/v1/creators \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testcreator",
    "email": "test@creator.com",
    "walletAddress": "0x742d35Cc6354C1532265331e8b8F6Cf0c3e7c3E",
    "contentTypes": ["articles"],
    "platforms": ["substack"],
    "bio": "Test creator for demo"
  }'
```

### 2. Upload Test Content
```bash
curl -X POST http://localhost:3000/api/v1/content \
  -H "Content-Type: application/json" \
  -d '{
    "creatorId": "CREATOR_ID_FROM_ABOVE",
    "title": "Test Article",
    "content": "This is the full content that requires payment to access...",
    "excerpt": "This is a free preview of the article...",
    "contentType": "article",
    "price": 0.05,
    "tags": ["test", "demo"]
  }'
```

### 3. Test Payment Flow
```bash
# First request (should return 402)
curl http://localhost:3000/api/v1/content/CONTENT_ID

# With payment proof (after sending USDC)
curl http://localhost:3000/api/v1/content/CONTENT_ID \
  -H "X-Payment-Proof: 0xTRANSACTION_HASH"
```

## Production Deployment

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_NAME=creatorpay_prod
BASE_RPC_URL=https://mainnet.base.org
PLATFORM_WALLET=0xYourProductionWallet
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Database Considerations
- Use connection pooling for production
- Set up read replicas for analytics queries
- Regular backups of payments table
- Monitor payment verification performance

### Security
- Rate limiting on API endpoints
- Input validation and sanitization  
- HTTPS in production
- Wallet security for platform fees
- Regular security audits

### Monitoring
- Payment success/failure rates
- Creator earnings tracking
- API response times
- Database performance
- Blockchain transaction monitoring

### Scaling Considerations
- Cache frequently accessed content
- Separate read/write database connections
- Queue system for payment processing
- CDN for content delivery
- Load balancing for multiple instances

## Architecture Summary

```
AI Agent → MCP Server → CreatorPay API → Database
                    ↓
               x402 Payment → Base L2 → Creator Wallet
```

### Core Components Built:
1. **X402 Payment Handler** - Manages micropayment flow
2. **Creator Service** - Onboarding and content management
3. **MCP Server** - AI agent integration
4. **HTTP API** - RESTful endpoints
5. **Database Schema** - PostgreSQL with analytics
6. **Test Client** - Simulates AI agent behavior

### Differentiators from PayToll:
- **Creator-focused** instead of API-focused
- **Content management system** built-in
- **Revenue analytics** for creators
- **MCP native integration** with AI agents
- **80/20 revenue split** favoring creators

This gives you a complete foundation for creator micropayments that can compete with PayToll by targeting the much larger creator economy market.