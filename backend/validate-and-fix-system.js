#!/usr/bin/env node

// Comprehensive system validation and auto-fix script
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
const bs58 = require('bs58');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
);

// System health status
const systemHealth = {
    database: { status: 'unknown', issues: [] },
    backend: { status: 'unknown', issues: [] },
    monitoring: { status: 'unknown', issues: [] },
    ml: { status: 'unknown', issues: [] },
    protection: { status: 'unknown', issues: [] },
    alerts: { status: 'unknown', issues: [] }
};

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, type = 'info') {
    const color = {
        error: colors.red,
        success: colors.green,
        warning: colors.yellow,
        info: colors.blue
    }[type] || colors.reset;
    
    console.log(`${color}${message}${colors.reset}`);
}

// 1. Check Database Health
async function checkDatabase() {
    log('\n=== Checking Database Health ===', 'info');
    
    try {
        // Check critical tables
        const criticalTables = [
            'wallet_tokens', 'protected_tokens', 'monitoring_stats',
            'ml_predictions', 'liquidity_velocity', 'protection_events'
        ];
        
        for (const table of criticalTables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
                
            if (error) {
                systemHealth.database.issues.push(`Table ${table} inaccessible: ${error.message}`);
            } else {
                log(`✅ Table ${table}: ${count} records`, 'success');
            }
        }
        
        // Check for stale data
        const { data: staleCheck } = await supabase
            .from('monitoring_stats')
            .select('updated_at')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
            
        if (staleCheck) {
            const age = Math.round((Date.now() - new Date(staleCheck.updated_at)) / 1000 / 60);
            if (age > 60) {
                systemHealth.database.issues.push(`Monitoring data is ${age} minutes old`);
            }
        }
        
        systemHealth.database.status = systemHealth.database.issues.length === 0 ? 'healthy' : 'unhealthy';
        
    } catch (error) {
        systemHealth.database.status = 'error';
        systemHealth.database.issues.push(error.message);
    }
}

// 2. Check Backend Services
async function checkBackend() {
    log('\n=== Checking Backend Services ===', 'info');
    
    try {
        const response = await axios.get('http://localhost:3001/api/enhanced/health');
        const health = response.data;
        
        log(`✅ Backend API: ${health.status}`, 'success');
        log(`✅ Uptime: ${Math.round(health.uptime / 60)} minutes`, 'success');
        
        // Check service health
        if (health.services) {
            Object.entries(health.services).forEach(([service, status]) => {
                if (status !== 'healthy' && status !== 'active') {
                    systemHealth.backend.issues.push(`Service ${service} is ${status}`);
                }
            });
        }
        
        systemHealth.backend.status = 'healthy';
        
    } catch (error) {
        systemHealth.backend.status = 'offline';
        systemHealth.backend.issues.push('Backend API not responding on port 3001');
    }
}

// 3. Check Monitoring System
async function checkMonitoring() {
    log('\n=== Checking Monitoring System ===', 'info');
    
    // Check active monitoring
    const { data: activeMonitoring, error } = await supabase
        .from('protected_tokens')
        .select('token_mint')
        .eq('monitoring_active', true);
        
    if (activeMonitoring && activeMonitoring.length > 0) {
        log(`✅ Active monitoring: ${activeMonitoring.length} tokens`, 'success');
        
        // Check if data is flowing
        for (const token of activeMonitoring.slice(0, 3)) { // Check first 3
            const { data: velocity } = await supabase
                .from('liquidity_velocity')
                .select('timestamp')
                .eq('token_mint', token.token_mint)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();
                
            if (velocity) {
                const age = Math.round((Date.now() - new Date(velocity.timestamp)) / 1000 / 60);
                if (age > 10) {
                    systemHealth.monitoring.issues.push(`Token ${token.token_mint.substring(0, 8)}... last update ${age}m ago`);
                }
            } else {
                systemHealth.monitoring.issues.push(`No velocity data for ${token.token_mint.substring(0, 8)}...`);
            }
        }
    } else {
        systemHealth.monitoring.issues.push('No tokens being monitored');
    }
    
    systemHealth.monitoring.status = systemHealth.monitoring.issues.length === 0 ? 'healthy' : 
                                    systemHealth.monitoring.issues.length < 3 ? 'degraded' : 'unhealthy';
}

// 4. Check ML System
async function checkMLSystem() {
    log('\n=== Checking ML System ===', 'info');
    
    // Check recent predictions
    const { data: recentML, error } = await supabase
        .from('ml_predictions')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
    if (recentML) {
        const age = Math.round((Date.now() - new Date(recentML.created_at)) / 1000 / 60);
        if (age > 60) {
            systemHealth.ml.issues.push(`ML predictions are ${age} minutes old`);
        } else {
            log(`✅ ML predictions: Last update ${age} minutes ago`, 'success');
        }
    } else {
        systemHealth.ml.issues.push('No ML predictions found');
    }
    
    // Check queue
    const { count: queueCount } = await supabase
        .from('ml_generation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
    if (queueCount > 50) {
        systemHealth.ml.issues.push(`ML queue backlog: ${queueCount} pending items`);
    }
    
    systemHealth.ml.status = systemHealth.ml.issues.length === 0 ? 'healthy' : 'degraded';
}

// 5. Check Protection System
async function checkProtection() {
    log('\n=== Checking Protection System ===', 'info');
    
    // Test key decryption
    const { data: protectedWallet } = await supabase
        .from('protected_wallets')
        .select('encrypted_key')
        .limit(1)
        .single();
        
    if (protectedWallet) {
        try {
            const key = getEncryptionKey();
            const buffer = Buffer.from(protectedWallet.encrypted_key, 'base64');
            const iv = buffer.slice(0, 16);
            const encrypted = buffer.slice(16);
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            const privateKey = decrypted.toString('utf8');
            bs58.decode(privateKey); // Validate base58
            
            log(`✅ Key decryption: Working`, 'success');
            systemHealth.protection.status = 'healthy';
            
        } catch (error) {
            systemHealth.protection.status = 'broken';
            systemHealth.protection.issues.push('Key decryption failing: ' + error.message);
            log(`❌ Key decryption: ${error.message}`, 'error');
        }
    } else {
        systemHealth.protection.issues.push('No protected wallets to test');
    }
}

// 6. Check Alert System
async function checkAlerts() {
    log('\n=== Checking Alert System ===', 'info');
    
    // Check Telegram configuration
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        log(`✅ Telegram: Configured`, 'success');
        
        // Check recent alerts
        const { data: recentAlerts } = await supabase
            .from('alert_history')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (recentAlerts) {
            const age = Math.round((Date.now() - new Date(recentAlerts.created_at)) / 1000 / 60 / 60);
            log(`✅ Last alert: ${age} hours ago`, 'success');
        }
        
        systemHealth.alerts.status = 'healthy';
    } else {
        systemHealth.alerts.status = 'not_configured';
        systemHealth.alerts.issues.push('Telegram not configured');
    }
}

// Helper function for encryption key
function getEncryptionKey() {
    const keyString = process.env.ENCRYPTION_KEY || 'PanicSwap_Default_Key_2025_CHANGE_THIS_IN_PRODUCTION';
    return crypto.createHash('sha256').update(keyString).digest().slice(0, 32);
}

// Auto-fix functions
async function autoFix() {
    log('\n\n=== Running Auto-Fix Procedures ===', 'warning');
    
    // Fix 1: Clean invalid test tokens
    if (systemHealth.backend.status === 'healthy') {
        log('\nCleaning invalid test tokens...', 'info');
        const { data: deleted } = await supabase
            .from('wallet_tokens')
            .delete()
            .like('token_mint', 'TestToken%')
            .select();
            
        if (deleted && deleted.length > 0) {
            log(`✅ Removed ${deleted.length} invalid test tokens`, 'success');
        }
    }
    
    // Fix 2: Trigger monitoring updates
    if (systemHealth.monitoring.status !== 'healthy' && systemHealth.backend.status === 'healthy') {
        log('\nTriggering monitoring updates...', 'info');
        
        const { data: tokens } = await supabase
            .from('protected_tokens')
            .select('token_mint, wallet_address')
            .eq('monitoring_active', true)
            .limit(5);
            
        for (const token of tokens || []) {
            try {
                await axios.post('http://localhost:3001/api/monitoring/force-update', {
                    tokenMint: token.token_mint,
                    walletAddress: token.wallet_address
                });
                log(`✅ Updated monitoring for ${token.token_mint.substring(0, 8)}...`, 'success');
            } catch (e) {
                log(`❌ Failed to update ${token.token_mint.substring(0, 8)}...`, 'error');
            }
        }
    }
    
    // Fix 3: Reset ML queue
    if (systemHealth.ml.status !== 'healthy') {
        log('\nResetting ML generation queue...', 'info');
        
        const { data: reset } = await supabase
            .from('ml_generation_queue')
            .update({ status: 'pending' })
            .eq('status', 'processing')
            .select();
            
        if (reset && reset.length > 0) {
            log(`✅ Reset ${reset.length} stuck ML queue items`, 'success');
        }
    }
}

// Generate summary report
function generateReport() {
    log('\n\n=== SYSTEM HEALTH SUMMARY ===', 'info');
    
    let overallHealth = 100;
    const weights = {
        database: 20,
        backend: 25,
        monitoring: 20,
        ml: 10,
        protection: 20,
        alerts: 5
    };
    
    Object.entries(systemHealth).forEach(([component, health]) => {
        const status = health.status;
        const weight = weights[component];
        
        let score = 0;
        let emoji = '❌';
        
        if (status === 'healthy') {
            score = 100;
            emoji = '✅';
        } else if (status === 'degraded') {
            score = 50;
            emoji = '🟡';
        } else if (status === 'offline' || status === 'broken') {
            score = 0;
            emoji = '🔴';
        } else if (status === 'not_configured') {
            score = 75;
            emoji = '⚠️';
        }
        
        overallHealth -= (weight * (100 - score) / 100);
        
        log(`${emoji} ${component.toUpperCase()}: ${status}`, 
            score === 100 ? 'success' : score >= 50 ? 'warning' : 'error');
            
        if (health.issues.length > 0) {
            health.issues.forEach(issue => {
                log(`   - ${issue}`, 'warning');
            });
        }
    });
    
    log(`\n📊 OVERALL SYSTEM HEALTH: ${Math.round(overallHealth)}%`, 
        overallHealth >= 80 ? 'success' : overallHealth >= 60 ? 'warning' : 'error');
        
    if (overallHealth < 100) {
        log('\n💡 Run with --fix flag to attempt automatic fixes', 'info');
    }
    
    return overallHealth;
}

// Main execution
async function main() {
    log('🔍 PanicSwap System Validation Tool v1.0', 'info');
    log('=====================================', 'info');
    
    // Run all checks
    await checkDatabase();
    await checkBackend();
    await checkMonitoring();
    await checkMLSystem();
    await checkProtection();
    await checkAlerts();
    
    // Run auto-fix if requested
    if (process.argv.includes('--fix')) {
        await autoFix();
    }
    
    // Generate report
    const health = generateReport();
    
    // Exit with appropriate code
    process.exit(health >= 80 ? 0 : 1);
}

// Run validation
main().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'error');
    process.exit(1);
});