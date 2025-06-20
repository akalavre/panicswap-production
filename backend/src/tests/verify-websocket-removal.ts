import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function searchForWebSocketReferences(directory: string): string[] {
  const results: string[] = [];
  
  try {
    // Search for WebSocket references in TypeScript/JavaScript files
    const searchCommand = `grep -r -i "websocket\\|socket\\.io\\|wsService\\|WebSocketService" ${directory} --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null || true`;
    const output = execSync(searchCommand, { encoding: 'utf-8' });
    
    if (output.trim()) {
      results.push(...output.trim().split('\n'));
    }
  } catch (error) {
    // Grep returns non-zero exit code if no matches found, which is fine
  }
  
  return results;
}

function checkPackageJson(filePath: string): string[] {
  const issues: string[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const pkg = JSON.parse(content);
    
    // Check dependencies
    const wsPackages = ['ws', 'socket.io', 'socket.io-client', '@types/ws'];
    
    for (const dep of wsPackages) {
      if (pkg.dependencies?.[dep]) {
        issues.push(`Found ${dep} in dependencies`);
      }
      if (pkg.devDependencies?.[dep]) {
        issues.push(`Found ${dep} in devDependencies`);
      }
    }
  } catch (error) {
    // File might not exist
  }
  
  return issues;
}

function verifyWebSocketRemoval() {
  console.log('\n' + '='.repeat(60));
  log('WEBSOCKET REMOVAL VERIFICATION', colors.bright + colors.cyan);
  console.log('='.repeat(60) + '\n');

  let hasIssues = false;

  // Check backend code
  log('Checking backend code for WebSocket references...', colors.yellow);
  const backendRefs = searchForWebSocketReferences(path.join(__dirname, '../../'));
  
  // Filter out this verification script, test files, and legitimate external WebSocket usage
  const filteredBackendRefs = backendRefs.filter(ref => 
    !ref.includes('verify-websocket-removal.ts') &&
    !ref.includes('test-supabase-realtime') &&
    !ref.includes('.git/') &&
    !ref.includes('node_modules/') &&
    !ref.includes('dist/') &&
    !ref.includes('// REMOVED:') && // Comments about removal
    !ref.includes('TokenDiscoveryService.ts') && // Legitimate PumpPortal WebSocket
    !ref.includes('test-') // Test files
  );
  
  if (filteredBackendRefs.length > 0) {
    log(`❌ Found ${filteredBackendRefs.length} WebSocket references in backend:`, colors.red);
    filteredBackendRefs.forEach(ref => console.log(`  - ${ref}`));
    hasIssues = true;
  } else {
    log('✅ No WebSocket references found in backend code', colors.green);
  }

  // Check frontend code
  log('\nChecking frontend code for WebSocket references...', colors.yellow);
  const frontendRefs = searchForWebSocketReferences(path.join(__dirname, '../../../../src'));
  
  if (frontendRefs.length > 0) {
    log(`⚠️  Found ${frontendRefs.length} WebSocket references in frontend (may need migration):`, colors.yellow);
    // Just show first 10 to avoid clutter
    frontendRefs.slice(0, 10).forEach(ref => console.log(`  - ${ref}`));
    if (frontendRefs.length > 10) {
      console.log(`  ... and ${frontendRefs.length - 10} more`);
    }
  } else {
    log('✅ No WebSocket references found in frontend code', colors.green);
  }

  // Check package.json files
  log('\nChecking package.json files...', colors.yellow);
  
  const backendPkgIssues = checkPackageJson(path.join(__dirname, '../../package.json'));
  if (backendPkgIssues.length > 0) {
    log('❌ Backend package.json issues:', colors.red);
    backendPkgIssues.forEach(issue => console.log(`  - ${issue}`));
    hasIssues = true;
  } else {
    log('✅ Backend package.json is clean', colors.green);
  }
  
  const rootPkgIssues = checkPackageJson(path.join(__dirname, '../../../../package.json'));
  if (rootPkgIssues.length > 0) {
    log('❌ Root package.json issues:', colors.red);
    rootPkgIssues.forEach(issue => console.log(`  - ${issue}`));
    hasIssues = true;
  } else {
    log('✅ Root package.json is clean', colors.green);
  }

  // Check for WebSocket service file
  log('\nChecking for WebSocket service files...', colors.yellow);
  const wsServicePath = path.join(__dirname, '../services/WebSocketService.ts');
  if (fs.existsSync(wsServicePath)) {
    log('❌ WebSocketService.ts still exists!', colors.red);
    hasIssues = true;
  } else {
    log('✅ WebSocketService.ts has been removed', colors.green);
  }

  // Check for frontend websocket directory
  const frontendWsDir = path.join(__dirname, '../../../../src/services/websocket');
  if (fs.existsSync(frontendWsDir)) {
    log('❌ Frontend websocket directory still exists!', colors.red);
    hasIssues = true;
  } else {
    log('✅ Frontend websocket directory has been removed', colors.green);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (hasIssues) {
    log('❌ VERIFICATION FAILED - WebSocket removal incomplete', colors.bright + colors.red);
    log('\nPlease address the issues above before proceeding.', colors.yellow);
  } else {
    log('✅ VERIFICATION PASSED - WebSocket has been fully removed!', colors.bright + colors.green);
    log('\nThe migration to Supabase Realtime is complete.', colors.cyan);
  }
  console.log('='.repeat(60) + '\n');
}

// Run verification
verifyWebSocketRemoval();