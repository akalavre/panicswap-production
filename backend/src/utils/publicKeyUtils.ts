import { PublicKey } from '@solana/web3.js';

/**
 * Safely parse a string into a PublicKey, returning null if invalid
 */
export function safeParsePubkey(input: any): PublicKey | null {
  try {
    // Basic validation
    if (!input || typeof input !== 'string') {
      return null;
    }
    
    // Minimum length check for Solana public keys
    if (input.length < 32 || input.length > 44) {
      return null;
    }
    
    // Check if it matches base58 pattern
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(input)) {
      return null;
    }
    
    return new PublicKey(input);
  } catch (error) {
    return null;
  }
}

/**
 * Validate and create a PublicKey, throwing a user-friendly error if invalid
 */
export function validatePublicKey(input: string, fieldName: string = 'address'): PublicKey {
  const pubkey = safeParsePubkey(input);
  
  if (!pubkey) {
    throw new Error(`Invalid ${fieldName}: must be a valid Solana public key`);
  }
  
  return pubkey;
}

/**
 * Check if a string is a valid public key without creating a PublicKey object
 */
export function isValidPublicKey(input: any): boolean {
  return safeParsePubkey(input) !== null;
}