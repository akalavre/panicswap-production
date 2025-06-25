const { heliusTokenDiscoveryService } = require('./dist/services/HeliusTokenDiscoveryService');

async function updateExistingTokens() {
  console.log('🔄 Updating holder counts for existing tokens...');
  
  try {
    // Update holder counts for up to 5 tokens for testing
    await heliusTokenDiscoveryService.updateAllHolderCounts(5);
    console.log('✅ Holder count updates initiated successfully');
    
    // Wait a bit for the updates to complete
    console.log('⏳ Waiting for updates to complete...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    
    console.log('🎉 Update process complete!');
  } catch (error) {
    console.error('❌ Error updating holder counts:', error);
  }
}

updateExistingTokens().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Update failed:', error);
  process.exit(1);
});