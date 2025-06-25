<div class="bg-gradient-to-r from-primary-900/20 to-purple-900/20 border border-primary-600/50 rounded-lg p-4 mb-6">
    <div class="flex items-center gap-2 mb-3">
        <h4 class="text-sm font-semibold text-primary-300">🚀 Live Demo</h4>
        <span class="text-xs text-gray-400">• Test any token</span>
    </div>
    
    <div class="flex gap-2">
        <input 
            placeholder="Token mint address" 
            class="flex-1 bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" 
            type="text" 
            id="demo-token-input"
        >
        <button class="btn-primary px-6 py-2 text-sm font-medium" onclick="startDemo(event)">
            Demo
        </button>
    </div>
    
    <div class="flex gap-3 mt-2 text-xs">
        <button class="text-gray-500 hover:text-primary-400 transition-colors" onclick="setDemoToken('EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm')">WIF</button>
        <button class="text-gray-500 hover:text-primary-400 transition-colors" onclick="setDemoToken('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')">BONK</button>
        <button class="text-gray-500 hover:text-primary-400 transition-colors" onclick="setDemoToken('HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC')">PENG</button>
    </div>
</div>