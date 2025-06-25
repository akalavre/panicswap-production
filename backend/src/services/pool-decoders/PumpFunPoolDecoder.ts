import { AccountInfo, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { PoolDecoder, PoolMetadata } from './PoolDecoderRegistry';

// Pump.fun uses a bonding curve model
interface PumpFunPoolState {
  tokenMint: PublicKey;
  solReserve: BN;
  tokenReserve: BN;
  virtualSolReserve: BN;
  virtualTokenReserve: BN;
  complete: boolean;
}

export class PumpFunPoolDecoder implements PoolDecoder {
  // Pump.fun Program ID
  readonly name = 'Pump.fun';
  readonly programId = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
  private PUMP_FUN_PROGRAM = new PublicKey(this.programId);

  canDecode(account: AccountInfo<Buffer>): boolean {
    // Pump.fun bonding curve accounts are typically around 200 bytes
    return account.data.length >= 100 && account.data.length <= 300;
  }

  /**
   * Decode Pump.fun bonding curve account
   */
  decode(account: AccountInfo<Buffer>, poolAddress: PublicKey): PoolMetadata | null {
    const data = account.data;
    try {
      if (data.length < 100) {
        // Not a pump.fun account
        return null;
      }

      let offset = 8; // Skip discriminator

      // Read token mint (32 bytes)
      const tokenMint = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Read SOL reserve (8 bytes)
      const solReserve = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      // Read token reserve (8 bytes)
      const tokenReserve = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      // Read virtual SOL reserve (8 bytes)
      const virtualSolReserve = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      // Read virtual token reserve (8 bytes)
      const virtualTokenReserve = new BN(data.slice(offset, offset + 8), 'le');
      offset += 8;

      // Read complete flag (1 byte)
      const complete = data.readUInt8(offset) === 1;

      // Calculate current SOL in the bonding curve
      const solLiquidity = solReserve.toNumber() / 1e9; // Convert lamports to SOL

      return {
        poolAddress: poolAddress.toString(),
        tokenMint: tokenMint.toString(),
        quoteMint: 'So11111111111111111111111111111111111111112', // SOL
        liquidity: solLiquidity * 150, // Assuming SOL = $150
        programId: this.programId,
        type: 'pump.fun',
        additionalData: {
          solReserve: solReserve.toString(),
          tokenReserve: tokenReserve.toString(),
          virtualSolReserve: virtualSolReserve.toString(),
          virtualTokenReserve: virtualTokenReserve.toString(),
          complete,
        }
      };

    } catch (error) {
      // Not a valid pump.fun pool
      return null;
    }
  }

  /**
   * Calculate token price from bonding curve
   */
  calculatePrice(solReserve: BN, tokenReserve: BN, virtualSolReserve: BN, virtualTokenReserve: BN): number {
    // Pump.fun uses constant product formula with virtual reserves
    // Price = (SOL Reserve + Virtual SOL) / (Token Reserve + Virtual Token)
    const totalSol = solReserve.add(virtualSolReserve);
    const totalToken = tokenReserve.add(virtualTokenReserve);
    
    if (totalToken.isZero()) return 0;
    
    // Price in SOL
    const priceInSol = totalSol.toNumber() / totalToken.toNumber();
    
    // Convert to USD (assuming SOL = $150)
    return priceInSol * 150;
  }

  /**
   * Check if bonding curve is about to complete (migrate to Raydium)
   */
  isNearCompletion(solReserve: BN): boolean {
    // Pump.fun migrates to Raydium at 85 SOL
    const solAmount = solReserve.toNumber() / 1e9;
    return solAmount > 80; // Alert when close to migration
  }

  /**
   * Check if this is a Pump.fun bonding curve account
   */
  isPumpFunPool(owner: PublicKey): boolean {
    return owner.equals(this.PUMP_FUN_PROGRAM);
  }
}