const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🦀 CreatorPay starting...', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: PORT
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve main website
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'CreatorPay Website',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// Demo API endpoints for the frontend to work
app.get('/api/v1/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      creators: 127,
      totalPaid: 12847,
      agents: 43,
      content: 1284
    }
  });
});

app.get('/api/v1/content', (req, res) => {
  const demoContent = [
    {
      id: 1,
      title: "The Future of AI Agent Economics",
      excerpt: "A deep dive into how AI agents will reshape the creator economy through automated micropayments...",
      price: 0.05,
      creator: { username: "vitalik", displayName: "Vitalik B." },
      contentType: "analysis",
      tags: ["ai", "economics", "agents"],
      views: 847
    },
    {
      id: 2,
      title: "Building with x402 Protocol",
      excerpt: "Technical tutorial on implementing HTTP-native crypto payments for your applications...",
      price: 0.03,
      creator: { username: "developer", displayName: "Dev Master" },
      contentType: "tutorial",
      tags: ["x402", "crypto", "payments"],
      views: 623
    },
    {
      id: 3,
      title: "Base L2 Performance Analysis",
      excerpt: "Comprehensive benchmarking of Base L2 for micropayment applications and throughput...",
      price: 0.08,
      creator: { username: "researcher", displayName: "Chain Analyst" },
      contentType: "research",
      tags: ["base", "l2", "performance"],
      views: 291
    }
  ];
  
  res.json({
    success: true,
    content: demoContent
  });
});

app.post('/api/v1/creators', (req, res) => {
  const { username, email, walletAddress, bio } = req.body;
  res.json({
    success: true,
    creator: {
      id: 'demo-creator-' + Date.now(),
      username: username,
      email: email,
      walletAddress: walletAddress,
      bio: bio,
      createdAt: new Date().toISOString()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🦀 CreatorPay Website running on port ${PORT}`);
  console.log(`🌐 Website: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`🔧 Health: http://localhost:${PORT}/health`);
});