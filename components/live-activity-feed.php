<section class="py-16">
    <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Live Protection Activity</h2>
        <div class="max-w-4xl mx-auto">
            <div class="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div class="space-y-4" id="activity-feed">
                    <!-- Activity items will be dynamically added here -->
                    <div class="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg animate-fade-in">
                        <div class="flex items-center space-x-3">
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span class="text-sm text-gray-300">Token protected: PUMP</span>
                        </div>
                        <span class="text-xs text-gray-500">Just now</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<script>
// Simulate live activity feed
(function() {
    const activities = [
        { type: 'protection', token: 'BONK', action: 'protected' },
        { type: 'exit', token: 'SCAM', action: 'auto-exited', reason: 'Liquidity drain detected' },
        { type: 'protection', token: 'WIF', action: 'protected' },
        { type: 'monitoring', token: 'MYRO', action: 'monitoring started' },
        { type: 'exit', token: 'RUG', action: 'auto-exited', reason: 'Dev wallet dump' }
    ];
    
    const feedElement = document.getElementById('activity-feed');
    
    function addActivity() {
        const activity = activities[Math.floor(Math.random() * activities.length)];
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-4 bg-gray-800/50 rounded-lg animate-slideIn';
        
        const statusColor = activity.type === 'exit' ? 'bg-red-500' : 'bg-green-500';
        
        item.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-2 h-2 ${statusColor} rounded-full animate-pulse"></div>
                <span class="text-sm text-gray-300">
                    ${activity.token} ${activity.action}
                    ${activity.reason ? `<span class="text-xs text-gray-500">(${activity.reason})</span>` : ''}
                </span>
            </div>
            <span class="text-xs text-gray-500">Just now</span>
        `;
        
        // Add to top of feed
        feedElement.insertBefore(item, feedElement.firstChild);
        
        // Remove old items
        while (feedElement.children.length > 5) {
            feedElement.removeChild(feedElement.lastChild);
        }
    }
    
    // Add initial activities
    setInterval(addActivity, 5000);
})();
</script>