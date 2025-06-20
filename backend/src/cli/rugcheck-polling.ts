#!/usr/bin/env node
import 'dotenv/config';
import { rugCheckPollingServiceV2 } from '../services/RugCheckPollingServiceV2';

async function main() {
  console.log('Starting RugCheck Polling Service V2...');
  
  // Start the polling service
  await rugCheckPollingServiceV2.startPolling();
  
  console.log('RugCheck Polling Service V2 is running...');
  console.log('The service will poll active tokens and update launch times.');
  console.log('Press Ctrl+C to stop.');
  
  // Keep the process alive
  process.on('SIGINT', async () => {
    console.log('\nShutting down RugCheck Polling Service...');
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\nShutting down RugCheck Polling Service...');
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Fatal error in RugCheck Polling Service:', error);
  process.exit(1);
});