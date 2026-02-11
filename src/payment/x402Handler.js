/**
 * x402 Payment Handler - Core micropayment infrastructure
 * Based on PayToll.io model but for creator content
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { v4 as uuidv4 } from 'uuid';

class X402PaymentHandler {
  constructor() {
    this.publicClient = createPublicClient({
      chain: base,
      transport: http()
    });
    
    // USDC contract on Base
    this.usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    this.platformWallet = process.env.PLATFORM_WALLET;
  }

  /**
   * Generate 402 Payment Required response
   * @param {string} creatorWallet - Creator's wallet address
   * @param {number} priceUSD - Price in USD (e.g., 0.05 for 5 cents)
   * @param {string} contentId - Unique content identifier
   */
  generate402Response(creatorWallet, priceUSD, contentId) {
    const paymentId = uuidv4();
    const amountUSDC = parseUnits(priceUSD.toString(), 6); // USDC has 6 decimals
    
    const paymentRequest = {
      id: paymentId,
      amount: amountUSDC.toString(),
      currency: 'USDC',
      recipient: creatorWallet,
      chainId: base.id,
      tokenAddress: this.usdcAddress,
      contentId: contentId,
      expires: Date.now() + 300000 // 5 minute expiry
    };

    return {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'x402-usdc-base',
        'X-Payment-Amount': amountUSDC.toString(),
        'X-Payment-Recipient': creatorWallet,
        'X-Payment-Token': this.usdcAddress,
        'X-Payment-Chain': base.id.toString()
      },
      body: {
        error: 'Payment Required',
        payment: paymentRequest,
        instructions: {
          method: 'USDC transfer on Base L2',
          amount: `${priceUSD} USDC`,
          recipient: creatorWallet,
          memo: paymentId
        }
      }
    };
  }

  /**
   * Verify payment proof from AI agent
   * @param {string} txHash - Transaction hash from payment
   * @param {string} paymentId - Original payment ID
   * @param {string} creatorWallet - Expected recipient
   * @param {string} expectedAmount - Expected amount in USDC
   */
  async verifyPayment(txHash, paymentId, creatorWallet, expectedAmount) {
    try {
      // Get transaction details from Base L2
      const tx = await this.publicClient.getTransaction({
        hash: txHash
      });

      if (!tx) {
        return { valid: false, error: 'Transaction not found' };
      }

      // Verify transaction is confirmed
      const receipt = await this.publicClient.getTransactionReceipt({
        hash: txHash
      });

      if (receipt.status !== 'success') {
        return { valid: false, error: 'Transaction failed' };
      }

      // For USDC transfers, we need to decode the transfer logs
      const transferLog = receipt.logs.find(log => 
        log.address.toLowerCase() === this.usdcAddress.toLowerCase()
      );

      if (!transferLog) {
        return { valid: false, error: 'No USDC transfer found' };
      }

      // Decode USDC transfer (simplified - would need proper ABI decoding)
      const amount = transferLog.data; // This would need proper decoding
      const recipient = `0x${transferLog.topics[2].slice(26)}`; // Extract recipient from topics

      // Verify payment details
      if (recipient.toLowerCase() !== creatorWallet.toLowerCase()) {
        return { valid: false, error: 'Wrong recipient' };
      }

      // Calculate platform fee (20%)
      const totalAmount = BigInt(expectedAmount);
      const platformFee = totalAmount * 20n / 100n;
      const creatorAmount = totalAmount - platformFee;

      return {
        valid: true,
        txHash: txHash,
        amount: expectedAmount,
        creatorAmount: creatorAmount.toString(),
        platformFee: platformFee.toString(),
        timestamp: Number(tx.blockNumber)
      };

    } catch (error) {
      return { 
        valid: false, 
        error: `Payment verification failed: ${error.message}` 
      };
    }
  }

  /**
   * Calculate creator revenue split
   * @param {string} totalAmount - Total payment amount
   */
  calculateRevenueSplit(totalAmount) {
    const total = BigInt(totalAmount);
    const platformFee = total * 20n / 100n; // 20% platform fee
    const creatorAmount = total - platformFee; // 80% to creator

    return {
      total: total.toString(),
      creatorAmount: creatorAmount.toString(),
      platformFee: platformFee.toString(),
      creatorPercentage: 80,
      platformPercentage: 20
    };
  }
}

export default X402PaymentHandler;