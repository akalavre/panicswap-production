import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Pump.fun Bonding Curve Account Structure
 * Based on reverse engineering and community research
 */
export interface PumpFunBondingCurve {
  discriminator: number[];
  virtualTokenReserves: BN;
  virtualSolReserves: BN;
  realTokenReserves: BN;
  realSolReserves: BN;
  tokenTotalSupply: BN;
  complete: boolean;
  
  // Derived fields
  virtualTokenReservesNumber: number;
  virtualSolReservesNumber: number;
  realTokenReservesNumber: number;
  realSolReservesNumber: number;
  tokenTotalSupplyNumber: number;
}

/**
 * Decode pump.fun bonding curve account data
 * Account layout (total 176 bytes):
 * - 8 bytes: discriminator
 * - 8 bytes: virtual_token_reserves (u64)
 * - 8 bytes: virtual_sol_reserves (u64)
 * - 8 bytes: real_token_reserves (u64)
 * - 8 bytes: real_sol_reserves (u64)
 * - 8 bytes: token_total_supply (u64)
 * - 1 byte: complete (bool)
 * - remaining: padding/other fields
 */
export function decodePumpFunBondingCurve(data: Buffer): PumpFunBondingCurve | null {
  try {
    if (data.length < 49) {
      console.error('Invalid bonding curve data: too short');
      return null;
    }

    // Read discriminator (8 bytes)
    const discriminator = Array.from(data.slice(0, 8));
    
    // Read reserves and supply as u64 (8 bytes each)
    const virtualTokenReserves = new BN(data.slice(8, 16), 'le');
    const virtualSolReserves = new BN(data.slice(16, 24), 'le');
    const realTokenReserves = new BN(data.slice(24, 32), 'le');
    const realSolReserves = new BN(data.slice(32, 40), 'le');
    const tokenTotalSupply = new BN(data.slice(40, 48), 'le');
    
    // Read complete flag (1 byte)
    const complete = data[48] === 1;

    // Convert to numbers for easier use (with precision handling)
    const LAMPORTS_PER_SOL = 1e9;
    const TOKEN_DECIMALS = 1e6; // Most pump.fun tokens use 6 decimals

    return {
      discriminator,
      virtualTokenReserves,
      virtualSolReserves,
      realTokenReserves,
      realSolReserves,
      tokenTotalSupply,
      complete,
      
      // Derived number fields
      virtualTokenReservesNumber: virtualTokenReserves.toNumber() / TOKEN_DECIMALS,
      virtualSolReservesNumber: virtualSolReserves.toNumber() / LAMPORTS_PER_SOL,
      realTokenReservesNumber: realTokenReserves.toNumber() / TOKEN_DECIMALS,
      realSolReservesNumber: realSolReserves.toNumber() / LAMPORTS_PER_SOL,
      tokenTotalSupplyNumber: tokenTotalSupply.toNumber() / TOKEN_DECIMALS
    };
  } catch (error) {
    console.error('Error decoding bonding curve:', error);
    return null;
  }
}

/**
 * Calculate token price from bonding curve
 */
export function calculateTokenPrice(bondingCurve: PumpFunBondingCurve): number {
  if (bondingCurve.virtualTokenReservesNumber === 0) return 0;
  
  // Price = SOL reserves / Token reserves
  const priceInSol = bondingCurve.virtualSolReservesNumber / bondingCurve.virtualTokenReservesNumber;
  
  // Convert to USD (assuming SOL at $50 - in production, fetch real SOL price)
  const solPriceUsd = 50;
  return priceInSol * solPriceUsd;
}

/**
 * Get pump.fun associated accounts
 */
export function getPumpFunAccounts(tokenMint: PublicKey, programId: PublicKey) {
  // Bonding curve PDA
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), tokenMint.toBuffer()],
    programId
  );

  // Associated bonding curve PDA (holds the tokens)
  const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('associated-bonding-curve'),
      tokenMint.toBuffer(),
      bondingCurve.toBuffer()
    ],
    programId
  );

  return {
    bondingCurve,
    associatedBondingCurve
  };
}