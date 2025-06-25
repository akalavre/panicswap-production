import supabase from '../utils/supabaseClient';
import * as crypto from 'crypto';
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';

export interface EncryptedKey {
  encrypted_key: string;
  wallet_address: string;
}

export class KeyManagementService {
  private static instance: KeyManagementService;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-cbc';

  private constructor() {
    // Use environment variable or fallback to match PHP implementation
    let keyString = process.env.ENCRYPTION_KEY || 'PanicSwap_Default_Key_2025_CHANGE_THIS_IN_PRODUCTION';
    
    // Check if the key is base64 encoded (from .env file)
    if (keyString.match(/^[A-Za-z0-9+/]+=*$/)) {
      try {
        // Attempt to decode base64
        const decoded = Buffer.from(keyString, 'base64');
        if (decoded.length === 32) {
          // If it's exactly 32 bytes, use it directly as the key
          this.encryptionKey = decoded;
          console.log('[KeyManagement] Using base64-decoded 32-byte key from environment');
          return;
        }
      } catch (e) {
        // Not valid base64, treat as raw string
      }
    }
    
    // Fallback: Hash the key string to ensure 32 bytes for AES-256
    // This matches PHP's substr(hash('sha256', $key, true), 0, 32)
    this.encryptionKey = crypto.createHash('sha256').update(keyString).digest().slice(0, 32);
    console.log('[KeyManagement] Using SHA256-hashed key');
  }

  static getInstance(): KeyManagementService {
    if (!KeyManagementService.instance) {
      KeyManagementService.instance = new KeyManagementService();
    }
    return KeyManagementService.instance;
  }

  /**
   * Decrypt a private key encrypted with PHP's encryption method
   */
  private decryptPHPEncrypted(encryptedData: string): string {
    try {
      // Decode from base64
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extract IV (first 16 bytes) and encrypted content
      const iv = buffer.slice(0, 16);
      const encrypted = buffer.slice(16);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('[KeyManagement] Primary decryption failed, trying fallback with default key');
      
      // Fallback: Try with the default key hash
      try {
        const fallbackKey = crypto.createHash('sha256')
          .update('PanicSwap_Default_Key_2025_CHANGE_THIS_IN_PRODUCTION')
          .digest()
          .slice(0, 32);
        
        const buffer = Buffer.from(encryptedData, 'base64');
        const iv = buffer.slice(0, 16);
        const encrypted = buffer.slice(16);
        
        const decipher = crypto.createDecipheriv(this.algorithm, fallbackKey, iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        console.log('[KeyManagement] Successfully decrypted with fallback key');
        return decrypted.toString('utf8');
      } catch (fallbackError) {
        console.error('[KeyManagement] Both decryption attempts failed:', {
          primary: error,
          fallback: fallbackError
        });
        throw new Error('Failed to decrypt private key with both primary and fallback keys');
      }
    }
  }

  /**
   * Encrypt a private key for storage
   */
  encrypt(privateKey: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Encrypt
      let encrypted = cipher.update(privateKey, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Combine IV and encrypted data
      const combined = Buffer.concat([iv, encrypted]);
      
      // Return base64 encoded
      return combined.toString('base64');
    } catch (error) {
      console.error('Error encrypting private key:', error);
      throw new Error('Failed to encrypt private key');
    }
  }

  /**
   * Retrieve and decrypt a wallet's private key
   */
  async getPrivateKey(walletAddress: string): Promise<string | null> {
    try {
      // First try hot_wallets table (encrypted)
      const { data: hotWallet, error: hotWalletError } = await supabase
        .from('hot_wallets')
        .select('encrypted_key')
        .eq('wallet_address', walletAddress)
        .single();

      if (hotWallet && hotWallet.encrypted_key) {
        console.log(`[KeyManagement] Found encrypted key in hot_wallets for ${walletAddress}`);
        return this.decryptPHPEncrypted(hotWallet.encrypted_key);
      }

      // Try users table (encrypted keys)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('private_key')
        .eq('wallet_address', walletAddress)
        .single();

      if (user && user.private_key) {
        console.log(`[KeyManagement] Found encrypted key in users table for ${walletAddress}`);
        // Keys in users table are also encrypted by PHP
        return this.decryptPHPEncrypted(user.private_key);
      }

      console.log(`[KeyManagement] No private key found for ${walletAddress}`);
      return null;
    } catch (error) {
      console.error(`[KeyManagement] Error retrieving private key for ${walletAddress}:`, error);
      return null;
    }
  }

  /**
   * Validate a private key format
   */
  validatePrivateKey(privateKey: string): boolean {
    try {
      const decoded = bs58.decode(privateKey);
      return decoded.length === 64; // Solana private keys are 64 bytes
    } catch {
      return false;
    }
  }

  /**
   * Validate and create Keypair from private key
   */
  validateAndCreateKeypair(privateKey: string): Keypair | null {
    try {
      if (!this.validatePrivateKey(privateKey)) {
        console.error('[KeyManagementService] Invalid private key format');
        return null;
      }

      const privateKeyBytes = bs58.decode(privateKey);
      const keypair = Keypair.fromSecretKey(privateKeyBytes);
      
      // Verify the keypair is valid by checking the public key
      const publicKey = keypair.publicKey.toBase58();
      if (!publicKey || publicKey.length < 32) {
        console.error('[KeyManagementService] Invalid keypair generated');
        return null;
      }

      return keypair;
    } catch (error) {
      console.error('[KeyManagementService] Error creating keypair:', error);
      return null;
    }
  }

  /**
   * Store an encrypted private key (for hot wallets)
   */
  async storeEncryptedKey(walletAddress: string, privateKey: string): Promise<boolean> {
    try {
      if (!this.validatePrivateKey(privateKey)) {
        throw new Error('Invalid private key format');
      }

      const encryptedKey = this.encrypt(privateKey);

      const { error } = await supabase
        .from('hot_wallets')
        .upsert({
          wallet_address: walletAddress,
          encrypted_key: encryptedKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        });

      if (error) {
        console.error('[KeyManagement] Error storing encrypted key:', error);
        return false;
      }

      console.log(`[KeyManagement] Successfully stored encrypted key for ${walletAddress}`);
      return true;
    } catch (error) {
      console.error('[KeyManagement] Error in storeEncryptedKey:', error);
      return false;
    }
  }

  /**
   * Remove a stored private key
   */
  async removePrivateKey(walletAddress: string): Promise<boolean> {
    try {
      // Remove from hot_wallets
      const { error: hotWalletError } = await supabase
        .from('hot_wallets')
        .delete()
        .eq('wallet_address', walletAddress);

      // Remove from users table if in development
      if (process.env.NODE_ENV !== 'production') {
        const { error: userError } = await supabase
          .from('users')
          .update({ private_key: null })
          .eq('wallet_address', walletAddress);
      }

      return !hotWalletError;
    } catch (error) {
      console.error('[KeyManagement] Error removing private key:', error);
      return false;
    }
  }
}

export const keyManagementService = KeyManagementService.getInstance();