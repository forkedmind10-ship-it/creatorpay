/**
 * Test Client - Simulates AI Agent accessing creator content
 * Shows how Claude, OpenClaw, etc. would interact with CreatorPay
 */

import fetch from 'node-fetch';
import { createWalletClient, http, parseUnits, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

class AgentClient {
  constructor(privateKey, apiBase = 'http://localhost:3000') {
    this.apiBase = apiBase;
    this.account = privateKeyToAccount(privateKey);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: base,
      transport: http()
    });
    this.publicClient = createPublicClient({
      chain: base,
      transport: http()
    });
    
    // USDC contract on Base
    this.usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  }

  /**
   * Search for creator content
   */
  async searchContent(query, options = {}) {
    const params = new URLSearchParams({ q: query, ...options });
    const response = await fetch(`${this.apiBase}/api/v1/content?${params}`);
    return response.json();
  }

  /**
   * Get content preview (free)
   */
  async getPreview(contentId) {
    const response = await fetch(`${this.apiBase}/api/v1/content/${contentId}`);
    return response.json();
  }

  /**
   * Purchase and access full content
   */
  async purchaseContent(contentId) {
    try {
      console.log(`🔍 Attempting to access content: ${contentId}`);
      
      // First, try to access without payment (should get 402)
      const initialResponse = await fetch(`${this.apiBase}/api/v1/content/${contentId}`);
      
      if (initialResponse.status !== 402) {
        throw new Error(`Expected 402, got ${initialResponse.status}`);
      }

      const paymentData = await initialResponse.json();
      console.log('💳 Payment required:', paymentData.payment);

      // Extract payment details
      const { recipient, amount, tokenAddress } = paymentData.payment;
      console.log(`💰 Paying ${amount} USDC to ${recipient}`);

      // Send USDC payment
      const txHash = await this.sendUSDCPayment(recipient, amount);
      console.log(`✅ Payment sent: ${txHash}`);

      // Wait for confirmation
      console.log('⏳ Waiting for transaction confirmation...');
      await this.waitForTransaction(txHash);

      // Access content with payment proof
      console.log('🎯 Accessing content with payment proof...');
      const contentResponse = await fetch(`${this.apiBase}/api/v1/content/${contentId}`, {
        headers: {
          'X-Payment-Proof': txHash
        }
      });

      if (!contentResponse.ok) {
        const error = await contentResponse.json();
        throw new Error(`Content access failed: ${error.error}`);
      }

      const content = await contentResponse.json();
      console.log('🎉 Content purchased successfully!');
      
      return content.data;

    } catch (error) {
      console.error('❌ Purchase failed:', error.message);
      throw error;
    }
  }

  /**
   * Send USDC payment to creator
   */
  async sendUSDCPayment(recipient, amountUSDC) {
    // This is a simplified version - in reality you'd need the full USDC contract ABI
    const tx = await this.walletClient.sendTransaction({
      to: this.usdcAddress,
      data: this.encodeUSDCTransfer(recipient, amountUSDC)
    });

    return tx;
  }

  /**
   * Encode USDC transfer (simplified)
   */
  encodeUSDCTransfer(recipient, amount) {
    // This is highly simplified - you'd use proper contract encoding
    // For demo purposes, we'll just return a placeholder
    return `0xa9059cbb${recipient.slice(2).padStart(64, '0')}${BigInt(amount).toString(16).padStart(64, '0')}`;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash) {
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!confirmed && attempts < maxAttempts) {
      try {
        const receipt = await this.publicClient.getTransactionReceipt({
          hash: txHash
        });

        if (receipt && receipt.status === 'success') {
          confirmed = true;
          console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        }
      } catch (error) {
        // Transaction not yet mined
      }

      if (!confirmed) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }

    if (!confirmed) {
      throw new Error('Transaction confirmation timeout');
    }
  }

  /**
   * Demo: AI agent workflow
   */
  async demonstrateWorkflow() {
    console.log('🤖 AI Agent Content Access Demo');
    console.log('================================\n');

    try {
      // 1. Search for content
      console.log('1. Searching for content about "payments"...');
      const searchResults = await this.searchContent('payments');
      console.log(`Found ${searchResults.data.count} results\n`);

      if (searchResults.data.count === 0) {
        console.log('No content found. Make sure the database has sample data.');
        return;
      }

      // 2. Get preview of first result
      const firstContent = searchResults.data.content[0];
      console.log(`2. Getting preview of "${firstContent.title}" by @${firstContent.username}...`);
      console.log(`   Price: $${firstContent.price_usd} USD`);
      console.log(`   Preview: ${firstContent.excerpt.slice(0, 100)}...\n`);

      // 3. Purchase full content
      console.log('3. Purchasing full content...');
      const purchasedContent = await this.purchaseContent(firstContent.id);
      
      console.log('\n🎉 SUCCESS! Content purchased and accessed.');
      console.log('================================');
      console.log(`Title: ${purchasedContent.title}`);
      console.log(`Creator: @${purchasedContent.creator}`);
      console.log(`Price: $${purchasedContent.price} USD`);
      console.log(`Payment: ${purchasedContent.payment.txHash}`);
      console.log(`Creator Earned: ${purchasedContent.payment.creatorEarned} USDC`);
      console.log('\nFull Content:');
      console.log(purchasedContent.content);

    } catch (error) {
      console.error('Demo failed:', error.message);
    }
  }
}

// Example usage
async function runDemo() {
  // You would need a real private key with USDC on Base L2 for this to work
  const TEST_PRIVATE_KEY = '0x' + '0'.repeat(64); // Placeholder
  
  if (TEST_PRIVATE_KEY === '0x' + '0'.repeat(64)) {
    console.log('⚠️  Demo requires a real private key with USDC on Base L2');
    console.log('Update TEST_PRIVATE_KEY in agentClient.js to run the demo');
    return;
  }

  const agent = new AgentClient(TEST_PRIVATE_KEY);
  await agent.demonstrateWorkflow();
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo();
}

export default AgentClient;