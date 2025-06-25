import axios from 'axios';
import { injectable } from 'inversify';

interface GoPlusTokenSecurity {
  balance_mutable_authority?: {
    "0": string;
    "1": string;
  };
  closable?: {
    "0": string;
    "1": string;
  };
  creators?: any[];
  default_account_state?: string;
  default_account_state_upgradable?: {
    "0": string;
    "1": string;
  };
  dex?: Array<{
    name: string;
    liquidity: string;
    pair: string;
  }>;
  freezable?: {
    "0": string;
    "1": string;
  };
  holder_count?: string;
  holders?: Array<{
    address: string;
    balance: string;
    percent: string;
    tag?: string;
  }>;
  lp_holders?: any[];
  metadata?: any;
  metadata_mutable?: {
    "0": string;
    "1": string;
  };
  mintable?: {
    "0": string;
    "1": string;
  };
  non_transferable?: string;
  total_supply?: string;
  transfer_fee?: any;
  transfer_fee_upgradable?: {
    "0": string;
    "1": string;
  };
  transfer_hook?: any[];
  transfer_hook_upgradable?: {
    "0": string;
    "1": string;
  };
  trusted_token?: number;
}

export interface GoPlusRiskAssessment {
  tokenAddress: string;
  isHoneypot: boolean;
  isMintable: boolean;
  isFreezable: boolean;
  hasTransferFee: boolean;
  isNonTransferable: boolean;
  hasBalanceMutableAuthority: boolean;
  isClosable: boolean;
  isTrustedToken: boolean;
  holderCount: number;
  topHolderConcentration: number;
  liquidityUSD: number;
  dexCount: number;
  riskScore: number; // 0-100, higher is riskier
  riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  risks: string[];
}

@injectable()
export class GoPlusSecurityService {
  private readonly API_BASE = 'https://api.gopluslabs.io/api/v1';
  private readonly CHAIN_ID = 'solana';
  
  async checkTokenSecurity(tokenAddress: string): Promise<GoPlusRiskAssessment | null> {
    try {
      const url = `${this.API_BASE}/${this.CHAIN_ID}/token_security`;
      const response = await axios.get(url, {
        params: { contract_addresses: tokenAddress },
        timeout: 10000
      });
      
      if (response.data?.code !== 1 || !response.data?.result) {
        console.warn(`GoPlus API returned no data for ${tokenAddress}`);
        return null;
      }
      
      const tokenData = response.data.result[tokenAddress];
      if (!tokenData) {
        console.warn(`No token data found for ${tokenAddress}`);
        return null;
      }
      
      return this.assessRisk(tokenAddress, tokenData);
      
    } catch (error) {
      console.error('GoPlus API error:', error);
      return null;
    }
  }
  
  private assessRisk(tokenAddress: string, data: GoPlusTokenSecurity): GoPlusRiskAssessment {
    const risks: string[] = [];
    let riskScore = 0;
    
    // Check if it's a honeypot (non-transferable)
    const isNonTransferable = data.non_transferable === '1';
    if (isNonTransferable) {
      risks.push('Token is non-transferable (honeypot)');
      riskScore += 100;
    }
    
    // Check mintable
    const isMintable = data.mintable?.["1"] === '1';
    if (isMintable) {
      risks.push('Token supply can be increased (mintable)');
      riskScore += 30;
    }
    
    // Check freezable
    const isFreezable = data.freezable?.["1"] === '1';
    if (isFreezable) {
      risks.push('Accounts can be frozen');
      riskScore += 40;
    }
    
    // Check balance mutable authority
    const hasBalanceMutableAuthority = data.balance_mutable_authority?.["1"] === '1';
    if (hasBalanceMutableAuthority) {
      risks.push('Balance can be modified by authority');
      riskScore += 50;
    }
    
    // Check closable
    const isClosable = data.closable?.["1"] === '1';
    if (isClosable) {
      risks.push('Token accounts can be closed');
      riskScore += 20;
    }
    
    // Check transfer fees
    const hasTransferFee = data.transfer_fee && Object.keys(data.transfer_fee).length > 0;
    if (hasTransferFee) {
      risks.push('Token has transfer fees');
      riskScore += 15;
    }
    
    // Calculate holder concentration
    const holderCount = parseInt(data.holder_count || '0');
    let topHolderConcentration = 0;
    
    if (data.holders && data.holders.length > 0) {
      // Sum top 10 holders
      const top10 = data.holders.slice(0, 10);
      topHolderConcentration = top10.reduce((sum, holder) => {
        return sum + parseFloat(holder.percent || '0');
      }, 0);
      
      if (topHolderConcentration > 50) {
        risks.push(`Top 10 holders own ${topHolderConcentration.toFixed(2)}% of supply`);
        riskScore += Math.min(30, topHolderConcentration / 2);
      }
    }
    
    // Check liquidity
    let liquidityUSD = 0;
    const dexCount = data.dex?.length || 0;
    
    if (data.dex && data.dex.length > 0) {
      // Sum liquidity from all DEXs
      liquidityUSD = data.dex.reduce((sum, dex) => {
        return sum + parseFloat(dex.liquidity || '0');
      }, 0);
    }
    
    if (liquidityUSD < 10000) {
      risks.push(`Low liquidity: $${liquidityUSD.toFixed(2)}`);
      riskScore += 25;
    }
    
    // Determine risk level
    let riskLevel: GoPlusRiskAssessment['riskLevel'];
    if (riskScore >= 80) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 60) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 40) {
      riskLevel = 'MODERATE';
    } else if (riskScore >= 20) {
      riskLevel = 'LOW';
    } else {
      riskLevel = 'MINIMAL';
    }
    
    // Bonus: trusted token reduces risk
    const isTrustedToken = data.trusted_token === 1;
    if (isTrustedToken && riskScore > 0) {
      riskScore = Math.max(0, riskScore - 20);
      if (riskLevel !== 'MINIMAL' && riskScore < 20) {
        riskLevel = 'LOW';
      }
    }
    
    return {
      tokenAddress,
      isHoneypot: isNonTransferable,
      isMintable,
      isFreezable,
      hasTransferFee,
      isNonTransferable,
      hasBalanceMutableAuthority,
      isClosable,
      isTrustedToken,
      holderCount,
      topHolderConcentration,
      liquidityUSD,
      dexCount,
      riskScore: Math.min(100, riskScore),
      riskLevel,
      risks
    };
  }
  
  // Batch check multiple tokens
  async checkMultipleTokens(tokenAddresses: string[]): Promise<Map<string, GoPlusRiskAssessment>> {
    const results = new Map<string, GoPlusRiskAssessment>();
    
    // GoPlus supports comma-separated addresses
    const batchSize = 30; // Their limit
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      
      try {
        const url = `${this.API_BASE}/${this.CHAIN_ID}/token_security`;
        const response = await axios.get(url, {
          params: { contract_addresses: batch.join(',') },
          timeout: 15000
        });
        
        if (response.data?.code === 1 && response.data?.result) {
          for (const [address, data] of Object.entries(response.data.result)) {
            if (data) {
              const assessment = this.assessRisk(address, data as GoPlusTokenSecurity);
              results.set(address, assessment);
            }
          }
        }
      } catch (error) {
        console.error(`GoPlus batch check error for batch ${i}:`, error);
      }
      
      // Rate limiting
      if (i + batchSize < tokenAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}