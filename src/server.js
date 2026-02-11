/**
 * CreatorPay API Server
 * Main HTTP server handling creator onboarding, content management, and payments
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import CreatorService from './creator/creatorService.js';
import X402PaymentHandler from './payment/x402Handler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'creatorpay',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

// Services
const creatorService = new CreatorService(db);
const paymentHandler = new X402PaymentHandler();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Serve main website
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'CreatorPay API',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes

/**
 * Creator Management
 */

// Onboard new creator
app.post('/api/v1/creators', async (req, res) => {
  try {
    const result = await creatorService.onboardCreator(req.body);
    res.status(201).json({
      success: true,
      message: 'Creator onboarded successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get creator profile
app.get('/api/v1/creators/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const result = await db.query(`
      SELECT cr.username, cr.bio, cr.content_types, cr.platforms, cr.website,
             COUNT(c.id) as content_count,
             AVG(c.price_usd) as avg_price
      FROM creators cr
      LEFT JOIN content c ON cr.id = c.creator_id AND c.status = 'active'
      WHERE cr.username = $1 AND cr.status = 'active'
      GROUP BY cr.id
    `, [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Creator not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get creator analytics
app.get('/api/v1/creators/:username/analytics', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Get creator ID
    const creatorResult = await db.query(
      'SELECT id FROM creators WHERE username = $1',
      [username]
    );
    
    if (creatorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Creator not found'
      });
    }

    const analytics = await creatorService.getAnalytics(creatorResult.rows[0].id);
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Content Management
 */

// Upload new content
app.post('/api/v1/content', async (req, res) => {
  try {
    const { creatorId } = req.body;
    const result = await creatorService.uploadContent(creatorId, req.body);
    res.status(201).json({
      success: true,
      message: 'Content uploaded successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get content (with payment gate)
app.get('/api/v1/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const paymentProof = req.headers['x-payment-proof'];

    // Get content details
    const result = await db.query(`
      SELECT c.*, cr.username, cr.wallet_address
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE c.id = $1 AND c.status = 'active'
    `, [contentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    const content = result.rows[0];

    // If no payment proof, return 402 Payment Required
    if (!paymentProof) {
      const payment402 = paymentHandler.generate402Response(
        content.wallet_address,
        content.price_usd,
        contentId
      );

      return res.status(402)
        .set(payment402.headers)
        .json(payment402.body);
    }

    // Verify payment
    const verification = await paymentHandler.verifyPayment(
      paymentProof,
      null,
      content.wallet_address,
      (content.price_usd * 1000000).toString()
    );

    if (!verification.valid) {
      return res.status(402).json({
        success: false,
        error: `Payment verification failed: ${verification.error}`
      });
    }

    // Record payment and return content
    await db.query(`
      INSERT INTO payments (
        id, content_id, creator_id, tx_hash, amount_usd,
        creator_amount, platform_fee, created_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (tx_hash) DO NOTHING
    `, [
      contentId, content.creator_id, paymentProof,
      content.price_usd, verification.creatorAmount, verification.platformFee
    ]);

    res.json({
      success: true,
      data: {
        id: content.id,
        title: content.title,
        content: content.content,
        contentType: content.content_type,
        creator: content.username,
        price: content.price_usd,
        payment: {
          verified: true,
          txHash: paymentProof,
          creatorEarned: verification.creatorAmount
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search content
app.get('/api/v1/content', async (req, res) => {
  try {
    const { q: query, creator, type, maxPrice, limit = 10 } = req.query;

    let sql = `
      SELECT c.id, c.title, c.excerpt, c.content_type, c.price_usd, c.tags, c.created_at,
             cr.username, cr.bio
      FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      WHERE c.status = 'active' AND cr.status = 'active'
    `;
    const params = [];
    let paramCount = 0;

    if (query) {
      paramCount++;
      sql += ` AND (c.title ILIKE $${paramCount} OR c.excerpt ILIKE $${paramCount})`;
      params.push(`%${query}%`);
    }

    if (creator) {
      paramCount++;
      sql += ` AND cr.username = $${paramCount}`;
      params.push(creator);
    }

    if (type) {
      paramCount++;
      sql += ` AND c.content_type = $${paramCount}`;
      params.push(type);
    }

    if (maxPrice) {
      paramCount++;
      sql += ` AND c.price_usd <= $${paramCount}`;
      params.push(parseFloat(maxPrice));
    }

    sql += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));

    const result = await db.query(sql, params);

    res.json({
      success: true,
      data: {
        content: result.rows,
        count: result.rows.length,
        query: { query, creator, type, maxPrice, limit }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Payment and Analytics
 */

// Get payment stats
app.get('/api/v1/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_creators,
        COUNT(DISTINCT co.id) as total_content,
        COUNT(p.id) as total_payments,
        SUM(p.amount_usd) as total_volume_usd,
        AVG(co.price_usd) as avg_content_price
      FROM creators c
      LEFT JOIN content co ON c.id = co.creator_id AND co.status = 'active'
      LEFT JOIN payments p ON co.id = p.content_id
      WHERE c.status = 'active'
    `);

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CreatorPay API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API Base: http://localhost:${PORT}/api/v1`);
});

export default app;