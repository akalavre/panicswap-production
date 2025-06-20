<div id="network-status" class="fixed bottom-4 right-4 z-50">
    <div class="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2 flex items-center space-x-2">
        <div id="network-indicator" class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span class="text-sm text-gray-300">Solana Mainnet</span>
        <span id="network-ping" class="text-xs text-gray-500">~23ms</span>
    </div>
</div>

<script>
// Update network status
(function() {
    const indicator = document.getElementById('network-indicator');
    const ping = document.getElementById('network-ping');
    
    // Simulate network ping updates
    setInterval(function() {
        const latency = Math.floor(Math.random() * 50) + 10;
        if (ping) {
            ping.textContent = `~${latency}ms`;
        }
        
        // Update indicator color based on latency
        if (indicator) {
            if (latency < 30) {
                indicator.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
            } else if (latency < 60) {
                indicator.className = 'w-2 h-2 bg-yellow-500 rounded-full animate-pulse';
            } else {
                indicator.className = 'w-2 h-2 bg-red-500 rounded-full animate-pulse';
            }
        }
    }, 5000);
})();
</script>