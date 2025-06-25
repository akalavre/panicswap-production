/**
 * Message Worker - Processes messages in separate thread
 * Optimized for fast pattern matching and threat detection
 */

const { parentPort } = require('worker_threads');

// Pattern matchers for quick threat detection
const THREAT_PATTERNS = {
    // Liquidity removal patterns
    LIQUIDITY_REMOVAL: [
        /removeLiquidity/i,
        /withdrawLiquidity/i,
        /burnAndCollect/i,
        /closePosition/i
    ],
    
    // Authority changes
    AUTHORITY_CHANGE: [
        /setAuthority/i,
        /transferOwnership/i,
        /updateAuthority/i,
        /revokeAuthority/i
    ],
    
    // Large transactions
    LARGE_SWAP: [
        /swap.*amount.*[0-9]{7,}/i,
        /sell.*amount.*[0-9]{7,}/i
    ],
    
    // Freeze operations
    FREEZE: [
        /freezeAccount/i,
        /freeze.*token/i,
        /disableTransfers/i
    ]
};

// Risk levels
const RISK_LEVELS = {
    CRITICAL: 100,
    HIGH: 75,
    MEDIUM: 50,
    LOW: 25
};

// Message handler
parentPort.on('message', async (data) => {
    const { type, batch, priority, timestamp } = data;
    
    if (type === 'processBatch') {
        const startTime = Date.now();
        const results = [];
        
        try {
            // Process each message in batch
            for (const message of batch) {
                const result = processMessage(message);
                if (result) {
                    results.push(result);
                }
            }
            
            // Send results back
            parentPort.postMessage({
                processingTime: Date.now() - startTime,
                results,
                worker: parentPort
            });
            
        } catch (error) {
            console.error('[Worker] Processing error:', error);
            parentPort.postMessage({
                processingTime: Date.now() - startTime,
                error: error.message,
                worker: parentPort
            });
        }
    }
});

/**
 * Process a single message
 */
function processMessage(message) {
    if (!message || !message.logs) return null;
    
    const threats = [];
    
    // Check each log entry
    for (const log of message.logs) {
        const threat = analyzeLog(log);
        if (threat) {
            threats.push(threat);
        }
    }
    
    // Return highest threat
    if (threats.length > 0) {
        threats.sort((a, b) => b.riskScore - a.riskScore);
        return {
            signature: message.signature,
            threat: threats[0],
            allThreats: threats,
            timestamp: Date.now()
        };
    }
    
    return null;
}

/**
 * Analyze a log entry for threats
 */
function analyzeLog(log) {
    if (typeof log !== 'string') return null;
    
    // Quick checks for each pattern type
    for (const [threatType, patterns] of Object.entries(THREAT_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(log)) {
                return {
                    type: threatType,
                    pattern: pattern.toString(),
                    riskScore: getRiskScore(threatType),
                    confidence: 0.9,
                    log: log.substring(0, 200) // Truncate for safety
                };
            }
        }
    }
    
    return null;
}

/**
 * Get risk score for threat type
 */
function getRiskScore(threatType) {
    const scores = {
        LIQUIDITY_REMOVAL: RISK_LEVELS.CRITICAL,
        AUTHORITY_CHANGE: RISK_LEVELS.HIGH,
        LARGE_SWAP: RISK_LEVELS.MEDIUM,
        FREEZE: RISK_LEVELS.CRITICAL
    };
    
    return scores[threatType] || RISK_LEVELS.LOW;
}

// Worker ready
console.log('[Worker] Message processing worker started');