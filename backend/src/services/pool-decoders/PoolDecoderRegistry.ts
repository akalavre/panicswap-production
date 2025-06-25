import { AccountInfo, PublicKey } from '@solana/web3.js';

export interface PoolMetadata {
  poolAddress: string;
  tokenMint: string;
  quoteMint: string;
  liquidity: number;
  programId: string;
  type: string;
  additionalData?: any;
}

export interface PoolDecoder {
  name: string;
  programId: string;
  canDecode(account: AccountInfo<Buffer>, programId?: PublicKey): boolean;
  decode(account: AccountInfo<Buffer>, poolAddress: PublicKey): PoolMetadata | null;
}

export class PoolDecoderRegistry {
  private decoders: Map<string, PoolDecoder> = new Map();
  private unknownPools: Set<string> = new Set();
  private decodingStats = {
    successful: 0,
    failed: 0,
    unknown: 0,
  };

  /**
   * Register a decoder
   */
  register(decoder: PoolDecoder): void {
    this.decoders.set(decoder.programId, decoder);
    console.log(`[PoolDecoder] Registered decoder: ${decoder.name} (${decoder.programId})`);
  }

  /**
   * Decode pool data
   */
  decode(
    account: AccountInfo<Buffer>, 
    poolAddress: PublicKey,
    programId?: PublicKey
  ): PoolMetadata | null {
    try {
      // Try to find decoder by program ID
      if (programId) {
        const decoder = this.decoders.get(programId.toString());
        if (decoder && decoder.canDecode(account, programId)) {
          const result = decoder.decode(account, poolAddress);
          if (result) {
            this.decodingStats.successful++;
            return result;
          }
        }
      }

      // Try all decoders
      for (const decoder of this.decoders.values()) {
        if (decoder.canDecode(account)) {
          const result = decoder.decode(account, poolAddress);
          if (result) {
            this.decodingStats.successful++;
            return result;
          }
        }
      }

      // Unknown pool type
      const poolKey = poolAddress.toString();
      if (!this.unknownPools.has(poolKey)) {
        this.unknownPools.add(poolKey);
        this.decodingStats.unknown++;
        
        console.warn(
          `[PoolDecoder] Unknown pool type: ${poolKey}`,
          {
            dataLength: account.data.length,
            programId: programId?.toString(),
            firstBytes: account.data.slice(0, 32).toString('hex'),
          }
        );
      }

      // Return generic pool data with estimated liquidity
      // Estimate liquidity based on account lamports (rough approximation)
      const estimatedLiquidity = account.lamports > 0 
        ? (account.lamports / 1e9) * 145 // Assume SOL price of $145
        : 1000; // Default fallback
      
      return {
        poolAddress: poolKey,
        tokenMint: 'unknown',
        quoteMint: 'unknown',
        liquidity: estimatedLiquidity,
        programId: programId?.toString() || 'unknown',
        type: 'unknown',
        additionalData: {
          dataLength: account.data.length,
          warning: 'Unable to decode pool data - using estimated liquidity',
          estimatedFromLamports: account.lamports,
        },
      };
    } catch (error) {
      this.decodingStats.failed++;
      console.error('[PoolDecoder] Decoding error:', error);
      return null;
    }
  }

  /**
   * Get list of registered decoders
   */
  getDecoders(): Array<{ name: string; programId: string }> {
    return Array.from(this.decoders.values()).map(d => ({
      name: d.name,
      programId: d.programId,
    }));
  }

  /**
   * Get decoding statistics
   */
  getStats() {
    return {
      ...this.decodingStats,
      unknownPools: this.unknownPools.size,
      registeredDecoders: this.decoders.size,
    };
  }

  /**
   * Clear unknown pools cache (for memory management)
   */
  clearUnknownCache(): void {
    const count = this.unknownPools.size;
    this.unknownPools.clear();
    console.log(`[PoolDecoder] Cleared ${count} unknown pool entries from cache`);
  }
}

// Export singleton instance
export const poolDecoderRegistry = new PoolDecoderRegistry();