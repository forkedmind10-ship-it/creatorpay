/**
 * MCP Server for Creator Content
 * Provides AI agents with direct access to creator content via micropayments
 * Integrates with Claude Desktop, OpenClaw, Cursor, etc.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import X402PaymentHandler from '../payment/x402Handler.js';

class CreatorMCPServer {
  constructor(database) {
    this.db = database;
    this.paymentHandler = new X402PaymentHandler();
    this.server = new Server(
      {
        name: 'creatorpay-mcp',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.setupTools();
    this.setupResources();
  }

  setupTools() {
    // Tool: Search creator content
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_creator_content':
          return this.searchCreatorContent(args);
        
        case 'get_content_excerpt':
          return this.getContentExcerpt(args);
        
        case 'purchase_content':
          return this.purchaseContent(args);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // List available tools
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'search_creator_content',
            description: 'Search available creator content by keywords or tags',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                creator: { type: 'string', description: 'Specific creator username (optional)' },
                contentType: { type: 'string', description: 'Content type filter (optional)' },
                maxPrice: { type: 'number', description: 'Maximum price in USD (optional)' }
              },
              required: ['query']
            }
          },
          {
            name: 'get_content_excerpt',
            description: 'Get free preview/excerpt of content before purchasing',
            inputSchema: {
              type: 'object',
              properties: {
                contentId: { type: 'string', description: 'Content ID' }
              },
              required: ['contentId']
            }
          },
          {
            name: 'purchase_content',
            description: 'Purchase full access to creator content via USDC micropayment',
            inputSchema: {
              type: 'object',
              properties: {
                contentId: { type: 'string', description: 'Content ID to purchase' },
                paymentProof: { type: 'string', description: 'Transaction hash proving payment' }
              },
              required: ['contentId']
            }
          }
        ]
      };
    });
  }

  setupResources() {
    // Resource: Creator content library
    this.server.setRequestHandler('resources/list', async () => {
      const creators = await this.db.query(`
        SELECT username, bio, content_types, 
               COUNT(content.id) as content_count,
               AVG(content.price_usd) as avg_price
        FROM creators 
        LEFT JOIN content ON creators.id = content.creator_id 
        WHERE creators.status = 'active' AND content.status = 'active'
        GROUP BY creators.id, username, bio, content_types
      `);

      return {
        resources: creators.rows.map(creator => ({
          uri: `creatorpay://creator/${creator.username}`,
          name: `@${creator.username}`,
          description: creator.bio,
          mimeType: 'application/json',
          annotations: {
            contentCount: creator.content_count,
            avgPrice: `$${creator.avg_price}`,
            contentTypes: creator.content_types
          }
        }))
      };
    });

    // Resource: Get specific creator content
    this.server.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;
      
      if (uri.startsWith('creatorpay://creator/')) {
        const username = uri.split('/').pop();
        return this.getCreatorProfile(username);
      }
      
      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  async searchCreatorContent(args) {
    const { query, creator, contentType, maxPrice } = args;

    try {
      let sql = `
        SELECT c.id, c.title, c.excerpt, c.content_type, c.price_usd, c.tags,
               cr.username, cr.bio
        FROM content c
        JOIN creators cr ON c.creator_id = cr.id
        WHERE c.status = 'active' AND cr.status = 'active'
      `;
      const params = [];
      let paramCount = 0;

      if (query) {
        paramCount++;
        sql += ` AND (c.title ILIKE $${paramCount} OR c.excerpt ILIKE $${paramCount} OR c.tags::text ILIKE $${paramCount})`;
        params.push(`%${query}%`);
      }

      if (creator) {
        paramCount++;
        sql += ` AND cr.username = $${paramCount}`;
        params.push(creator);
      }

      if (contentType) {
        paramCount++;
        sql += ` AND c.content_type = $${paramCount}`;
        params.push(contentType);
      }

      if (maxPrice) {
        paramCount++;
        sql += ` AND c.price_usd <= $${paramCount}`;
        params.push(maxPrice);
      }

      sql += ` ORDER BY c.created_at DESC LIMIT 10`;

      const results = await this.db.query(sql, params);

      return {
        content: [
          {
            type: 'text',
            text: `Found ${results.rows.length} pieces of content:\n\n` +
                  results.rows.map(row => 
                    `**${row.title}** by @${row.username}\n` +
                    `Price: $${row.price_usd} USD\n` +
                    `Type: ${row.content_type}\n` +
                    `Preview: ${row.excerpt}\n` +
                    `Content ID: ${row.id}\n`
                  ).join('\n')
          }
        ]
      };

    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async getContentExcerpt(args) {
    const { contentId } = args;

    try {
      const result = await this.db.query(`
        SELECT c.title, c.excerpt, c.price_usd, c.content_type,
               cr.username, cr.bio
        FROM content c
        JOIN creators cr ON c.creator_id = cr.id
        WHERE c.id = $1 AND c.status = 'active'
      `, [contentId]);

      if (result.rows.length === 0) {
        throw new Error('Content not found');
      }

      const content = result.rows[0];

      return {
        content: [
          {
            type: 'text',
            text: `**${content.title}** by @${content.username}\n\n` +
                  `${content.excerpt}\n\n` +
                  `Type: ${content.content_type}\n` +
                  `Price: $${content.price_usd} USD\n\n` +
                  `To access the full content, use the purchase_content tool with contentId: ${contentId}`
          }
        ]
      };

    } catch (error) {
      throw new Error(`Failed to get excerpt: ${error.message}`);
    }
  }

  async purchaseContent(args) {
    const { contentId, paymentProof } = args;

    try {
      // Get content details
      const contentResult = await this.db.query(`
        SELECT c.*, cr.wallet_address, cr.username
        FROM content c
        JOIN creators cr ON c.creator_id = cr.id
        WHERE c.id = $1 AND c.status = 'active'
      `, [contentId]);

      if (contentResult.rows.length === 0) {
        throw new Error('Content not found');
      }

      const content = contentResult.rows[0];

      // If no payment proof provided, return 402 Payment Required
      if (!paymentProof) {
        const payment402 = this.paymentHandler.generate402Response(
          content.wallet_address,
          content.price_usd,
          contentId
        );

        return {
          content: [
            {
              type: 'text',
              text: `Payment Required\n\n` +
                    `To access "${content.title}" by @${content.username}:\n\n` +
                    `1. Send ${content.price_usd} USDC to: ${content.wallet_address}\n` +
                    `2. Include memo: ${payment402.body.payment.id}\n` +
                    `3. Call this tool again with the transaction hash as paymentProof\n\n` +
                    `Network: Base L2\n` +
                    `Token: USDC (${payment402.body.payment.tokenAddress})`
            }
          ]
        };
      }

      // Verify payment proof
      const verification = await this.paymentHandler.verifyPayment(
        paymentProof,
        null, // We'd need to track payment IDs properly
        content.wallet_address,
        (content.price_usd * 1000000).toString() // Convert to USDC units
      );

      if (!verification.valid) {
        throw new Error(`Payment verification failed: ${verification.error}`);
      }

      // Record successful payment
      await this.db.query(`
        INSERT INTO payments (
          id, content_id, creator_id, tx_hash, amount_usd, 
          creator_amount, platform_fee, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        uuidv4(), contentId, content.creator_id, paymentProof,
        content.price_usd, verification.creatorAmount, verification.platformFee
      ]);

      // Return full content
      return {
        content: [
          {
            type: 'text',
            text: `**${content.title}** by @${content.username}\n\n` +
                  `${content.content}\n\n` +
                  `---\n` +
                  `Payment verified: $${content.price_usd} USDC\n` +
                  `Transaction: ${paymentProof}\n` +
                  `Creator earned: ${verification.creatorAmount} USDC (80%)`
          }
        ]
      };

    } catch (error) {
      throw new Error(`Purchase failed: ${error.message}`);
    }
  }

  async getCreatorProfile(username) {
    const result = await this.db.query(`
      SELECT cr.*, 
             COUNT(c.id) as content_count,
             AVG(c.price_usd) as avg_price
      FROM creators cr
      LEFT JOIN content c ON cr.id = c.creator_id AND c.status = 'active'
      WHERE cr.username = $1 AND cr.status = 'active'
      GROUP BY cr.id
    `, [username]);

    if (result.rows.length === 0) {
      throw new Error('Creator not found');
    }

    const creator = result.rows[0];

    return {
      contents: [
        {
          uri: `creatorpay://creator/${username}`,
          mimeType: 'application/json',
          text: JSON.stringify({
            username: creator.username,
            bio: creator.bio,
            contentTypes: creator.content_types,
            platforms: creator.platforms,
            contentCount: creator.content_count,
            averagePrice: creator.avg_price,
            website: creator.website
          }, null, 2)
        }
      ]
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('CreatorPay MCP Server running');
  }
}

export default CreatorMCPServer;