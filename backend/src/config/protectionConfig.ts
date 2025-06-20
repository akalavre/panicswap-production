export interface ProtectionConfig {
  // Smart detection thresholds
  smartDetection: {
    enabled: boolean;
    minHistoryPoints: number; // Minimum data points before making decisions
    historyWindowSeconds: number; // How much history to consider
    
    // Confidence thresholds
    minConfidenceToAlert: number; // 0-100
    minConfidenceToProtect: number; // 0-100
    
    // False positive mitigation
    momentumThreshold: number; // Positive momentum that indicates buying
    naturalCorrectionMax: number; // Max % drop after pump before it's suspicious
    newTokenGracePeriod: number; // Minutes before strict monitoring
  };
  
  // Traditional thresholds (fallback)
  traditional: {
    priceDropTrigger: number; // Percentage
    liquidityDropTrigger: number; // Percentage
    combinedTrigger: number; // Combined price + liquidity drop
  };
  
  // Token-specific overrides
  tokenOverrides: {
    [tokenMint: string]: {
      priceDropTrigger?: number;
      liquidityDropTrigger?: number;
      useSmartDetection?: boolean;
    };
  };
}

// Default configuration
export const defaultProtectionConfig: ProtectionConfig = {
  smartDetection: {
    enabled: true,
    minHistoryPoints: 10,
    historyWindowSeconds: 300, // 5 minutes
    minConfidenceToAlert: 60,
    minConfidenceToProtect: 75,
    momentumThreshold: 20, // 20% positive momentum = buying pressure
    naturalCorrectionMax: 40, // 40% correction after pump is natural
    newTokenGracePeriod: 60 // 1 hour grace period for new tokens
  },
  
  traditional: {
    priceDropTrigger: 20,
    liquidityDropTrigger: 50,
    combinedTrigger: 30 // If price + liquidity drop > 30% combined
  },
  
  tokenOverrides: {}
};

// User preference levels
export const protectionLevels: {
  conservative: ProtectionConfig;
  balanced: ProtectionConfig;
  aggressive: ProtectionConfig;
} = {
  conservative: {
    smartDetection: {
      ...defaultProtectionConfig.smartDetection,
      minConfidenceToAlert: 50,
      minConfidenceToProtect: 70,
      naturalCorrectionMax: 50
    },
    traditional: {
      priceDropTrigger: 30,
      liquidityDropTrigger: 60,
      combinedTrigger: 40
    },
    tokenOverrides: {}
  },
  
  balanced: defaultProtectionConfig,
  
  aggressive: {
    smartDetection: {
      ...defaultProtectionConfig.smartDetection,
      minConfidenceToAlert: 70,
      minConfidenceToProtect: 85,
      naturalCorrectionMax: 30
    },
    traditional: {
      priceDropTrigger: 15,
      liquidityDropTrigger: 40,
      combinedTrigger: 25
    },
    tokenOverrides: {}
  }
};

// Get configuration for a specific token
export function getTokenProtectionConfig(
  tokenMint: string,
  userLevel: 'conservative' | 'balanced' | 'aggressive' = 'balanced'
): ProtectionConfig {
  const baseConfig = protectionLevels[userLevel];
  const overrides = baseConfig.tokenOverrides?.[tokenMint];
  
  if (!overrides) return baseConfig;
  
  return {
    ...baseConfig,
    traditional: {
      ...baseConfig.traditional,
      ...overrides
    }
  };
}