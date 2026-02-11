/**
 * Creator Service - Handle creator onboarding and content management
 * This is what differentiates us from PayToll - creator-focused instead of API-focused
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class CreatorService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Onboard new creator
   * @param {Object} creatorData - Creator information
   */
  async onboardCreator(creatorData) {
    const {
      username,
      email,
      walletAddress,
      contentTypes, // ['articles', 'newsletters', 'research', 'code']
      platforms, // ['substack', 'medium', 'twitter', 'github']
      bio,
      website
    } = creatorData;

    try {
      // Validate wallet address (basic check)
      if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid wallet address');
      }

      // Check if creator already exists
      const existingCreator = await this.db.query(
        'SELECT id FROM creators WHERE wallet_address = $1 OR username = $2',
        [walletAddress, username]
      );

      if (existingCreator.rows.length > 0) {
        throw new Error('Creator already exists');
      }

      // Create creator profile
      const creatorId = uuidv4();
      const result = await this.db.query(`
        INSERT INTO creators (
          id, username, email, wallet_address, content_types, 
          platforms, bio, website, created_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'active')
        RETURNING *
      `, [
        creatorId, username, email, walletAddress,
        JSON.stringify(contentTypes), JSON.stringify(platforms),
        bio, website
      ]);

      // Generate API endpoint for this creator
      const apiEndpoint = `/api/v1/creator/${username}/content`;

      return {
        success: true,
        creator: result.rows[0],
        apiEndpoint: apiEndpoint,
        mcpConfig: this.generateMCPConfig(username, creatorId)
      };

    } catch (error) {
      throw new Error(`Creator onboarding failed: ${error.message}`);
    }
  }

  /**
   * Upload content for micropayment access
   * @param {string} creatorId - Creator's unique ID
   * @param {Object} contentData - Content information
   */
  async uploadContent(creatorId, contentData) {
    const {
      title,
      content,
      contentType, // 'article', 'newsletter', 'research', 'code'
      price, // in USD (e.g., 0.05 for 5 cents)
      tags,
      excerpt,
      metadata
    } = contentData;

    try {
      const contentId = uuidv4();
      
      // Store content in database
      const result = await this.db.query(`
        INSERT INTO content (
          id, creator_id, title, content, content_type, 
          price_usd, tags, excerpt, metadata, created_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'active')
        RETURNING *
      `, [
        contentId, creatorId, title, content, contentType,
        price, JSON.stringify(tags), excerpt, JSON.stringify(metadata)
      ]);

      // Generate payable API endpoint
      const apiEndpoint = `/api/v1/content/${contentId}`;

      return {
        success: true,
        content: result.rows[0],
        apiEndpoint: apiEndpoint,
        pricing: {
          priceUSD: price,
          estimatedRequests: Math.round(100 / price), // Rough estimate
          potentialMonthlyRevenue: Math.round(price * 1000) // If 1k requests
        }
      };

    } catch (error) {
      throw new Error(`Content upload failed: ${error.message}`);
    }
  }

  /**
   * Set pricing for content
   * @param {string} contentId - Content ID
   * @param {number} priceUSD - Price in USD
   * @param {string} creatorId - Creator ID for auth
   */
  async setPricing(contentId, priceUSD, creatorId) {
    try {
      // Verify creator owns this content
      const content = await this.db.query(
        'SELECT id FROM content WHERE id = $1 AND creator_id = $2',
        [contentId, creatorId]
      );

      if (content.rows.length === 0) {
        throw new Error('Content not found or unauthorized');
      }

      // Update pricing
      await this.db.query(
        'UPDATE content SET price_usd = $1, updated_at = NOW() WHERE id = $2',
        [priceUSD, contentId]
      );

      return {
        success: true,
        contentId: contentId,
        newPrice: priceUSD,
        message: `Price updated to $${priceUSD} USD`
      };

    } catch (error) {
      throw new Error(`Pricing update failed: ${error.message}`);
    }
  }

  /**
   * Generate MCP server config for AI agents
   * @param {string} username - Creator username
   * @param {string} creatorId - Creator ID
   */
  generateMCPConfig(username, creatorId) {
    return {
      mcpServers: {
        [`creatorpay-${username}`]: {
          command: "node",
          args: [`./mcp/creator-server.js`],
          env: {
            CREATOR_ID: creatorId,
            CREATOR_USERNAME: username,
            API_BASE: process.env.API_BASE || 'http://localhost:3000'
          }
        }
      }
    };
  }

  /**
   * Get creator analytics
   * @param {string} creatorId - Creator ID
   */
  async getAnalytics(creatorId) {
    try {
      // Get content stats
      const contentStats = await this.db.query(`
        SELECT 
          COUNT(*) as total_content,
          AVG(price_usd) as avg_price,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_content
        FROM content 
        WHERE creator_id = $1
      `, [creatorId]);

      // Get payment stats (last 30 days)
      const paymentStats = await this.db.query(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(creator_amount::numeric) as total_revenue_usdc,
          AVG(creator_amount::numeric) as avg_payment,
          COUNT(DISTINCT content_id) as monetized_content
        FROM payments 
        WHERE creator_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      `, [creatorId]);

      return {
        content: contentStats.rows[0],
        payments: paymentStats.rows[0],
        period: 'last_30_days'
      };

    } catch (error) {
      throw new Error(`Analytics failed: ${error.message}`);
    }
  }
}

export default CreatorService;