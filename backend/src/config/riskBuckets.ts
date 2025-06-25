/**
 * Dynamic Risk Bucket Configuration
 * Based on percentile distribution of combined scores
 */

export interface RiskBucket {
  level: string;
  minScore: number;
  maxScore: number;
  percentile: string;
  color: string;
  action: string;
}

// Default risk buckets - will be recalibrated based on actual data
export const DEFAULT_RISK_BUCKETS: RiskBucket[] = [
  { level: 'CRITICAL', minScore: 85, maxScore: 100, percentile: 'top 5%', color: 'red', action: 'sell' },
  { level: 'HIGH', minScore: 70, maxScore: 85, percentile: '5-15%', color: 'orange', action: 'reduce' },
  { level: 'MODERATE', minScore: 45, maxScore: 70, percentile: '15-35%', color: 'yellow', action: 'monitor' },
  { level: 'LOW', minScore: 25, maxScore: 45, percentile: '35-60%', color: 'blue', action: 'monitor' },
  { level: 'MINIMAL', minScore: 0, maxScore: 25, percentile: 'bottom 40%', color: 'green', action: 'safe' }
];

// Recalibrated buckets based on percentile analysis
export const CALIBRATED_RISK_BUCKETS: RiskBucket[] = [
  { level: 'CRITICAL', minScore: 75, maxScore: 100, percentile: 'top 5%', color: 'red', action: 'sell' },
  { level: 'HIGH', minScore: 55, maxScore: 75, percentile: '5-15%', color: 'orange', action: 'reduce' },
  { level: 'MODERATE', minScore: 35, maxScore: 55, percentile: '15-35%', color: 'yellow', action: 'monitor' },
  { level: 'LOW', minScore: 20, maxScore: 35, percentile: '35-60%', color: 'blue', action: 'monitor' },
  { level: 'MINIMAL', minScore: 0, maxScore: 20, percentile: 'bottom 40%', color: 'green', action: 'safe' }
];

/**
 * Get risk level for a given score
 */
export function getRiskLevel(score: number, useCalibrated: boolean = true): string {
  const buckets = useCalibrated ? CALIBRATED_RISK_BUCKETS : DEFAULT_RISK_BUCKETS;
  
  for (const bucket of buckets) {
    if (score >= bucket.minScore && score < bucket.maxScore) {
      return bucket.level;
    }
  }
  
  // Default to highest risk if score is 100
  if (score >= 100) return 'CRITICAL';
  
  return 'MINIMAL';
}

/**
 * Get recommendation for a given score
 */
export function getRecommendation(score: number, timeToRug?: number): string {
  // Urgent time-based recommendations
  if (timeToRug && timeToRug <= 12) {
    return 'sell';
  }
  
  const buckets = CALIBRATED_RISK_BUCKETS;
  
  for (const bucket of buckets) {
    if (score >= bucket.minScore && score < bucket.maxScore) {
      return bucket.action;
    }
  }
  
  return 'monitor';
}

/**
 * Dynamic bucket calibration based on score distribution
 */
export function calibrateBuckets(scores: number[]): RiskBucket[] {
  if (scores.length === 0) return CALIBRATED_RISK_BUCKETS;
  
  // Sort scores
  const sorted = [...scores].sort((a, b) => a - b);
  
  // Calculate percentiles
  const p5 = sorted[Math.floor(sorted.length * 0.95)];   // Top 5%
  const p15 = sorted[Math.floor(sorted.length * 0.85)];  // Top 15%
  const p35 = sorted[Math.floor(sorted.length * 0.65)];  // Top 35%
  const p60 = sorted[Math.floor(sorted.length * 0.40)];  // Top 60%
  
  return [
    { level: 'CRITICAL', minScore: p5, maxScore: 100, percentile: 'top 5%', color: 'red', action: 'sell' },
    { level: 'HIGH', minScore: p15, maxScore: p5, percentile: '5-15%', color: 'orange', action: 'reduce' },
    { level: 'MODERATE', minScore: p35, maxScore: p15, percentile: '15-35%', color: 'yellow', action: 'monitor' },
    { level: 'LOW', minScore: p60, maxScore: p35, percentile: '35-60%', color: 'blue', action: 'monitor' },
    { level: 'MINIMAL', minScore: 0, maxScore: p60, percentile: 'bottom 40%', color: 'green', action: 'safe' }
  ];
}