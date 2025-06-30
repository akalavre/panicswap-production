# Atomic Badge Renderer with Mutation-Observer Guard

An idempotent badge rendering system that eliminates flicker and ensures consistent state by:

1. **Reading final state from RiskStore** - Single source of truth
2. **Generating HTML once** - Efficient template generation  
3. **Comparing to existing innerHTML** - Only updates when changed
4. **Using debouncing** - Collapses burst events (50ms or `requestAnimationFrame`)

## Key Features

### ✅ Idempotent Rendering
- HTML is only updated when content actually changes
- Prevents unnecessary DOM manipulations
- Eliminates visual flicker from redundant updates

### ✅ Debounced Updates  
- 50ms debounce delay collapses burst events
- Uses `requestAnimationFrame` for optimal timing
- Per-token debouncing prevents interference

### ✅ Single Source of Truth
- All badge data comes from RiskStore singleton
- Consistent state across the application
- Event-driven updates via `riskchange` events

### ✅ Atomic DOM Updates
- DOM changes happen in single operations
- No intermediate states visible to users
- Better performance and user experience

## Usage

### Basic Integration

```html
<!-- Include required dependencies -->
<script src="assets/js/risk-store.js"></script>
<script src="assets/js/atomic-badge-renderer.js"></script>

<!-- Badge elements need data-risk-badge attribute -->
<div data-risk-badge="token_mint_address">Loading...</div>
```

### JavaScript API

```javascript
// Render a specific badge (debounced)
window.atomicBadgeRenderer.renderBadge(tokenMint);

// Render immediately without debouncing
window.atomicBadgeRenderer.renderBadgeSync(tokenMint);

// Render all badges on the page
window.atomicBadgeRenderer.renderAllBadges();

// Get debug information
const timers = window.atomicBadgeRenderer.getDebounceTimers();
const cachedHTML = window.atomicBadgeRenderer.getLastRenderedHTML(tokenMint);

// Cleanup resources
window.atomicBadgeRenderer.cleanup();
```

### Automatic Event Handling

The renderer automatically listens for `riskchange` events from RiskStore:

```javascript
// This will automatically trigger badge updates
window.RiskStore.setSource('token_mint', 'monitoring', {
    riskLevel: 'High',
    riskScore: 75,
    rugged: false,
    monitoring: true, // New monitoring flag for badge/tooltip rendering
    metadata: { reason: 'price_drop' }
});
```

## HTML Structure

The renderer generates structured badge HTML with:

- **Tailwind CSS classes** for styling
- **SVG icons** for visual indicators  
- **Tooltip data** for rich hover information
- **Data attributes** for token identification

### Example Output

```html
<span class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border rounded-md bg-red-100 border-red-300 text-red-800 cursor-help real-time-risk-badge"
      data-token-mint="token123"
      data-tooltip='{"riskLevel":"Critical","riskScore":85,"rugged":false}'>
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
    </svg>
    <span>Critical</span>
</span>
```

## Risk Level Mapping

| Risk Level | Color  | Background Class | Border Class | Text Class |
|------------|--------|------------------|--------------|------------|
| Safe       | Green  | `bg-green-100`   | `border-green-300` | `text-green-800` |
| Low        | Blue   | `bg-blue-100`    | `border-blue-300`  | `text-blue-800`  |
| Moderate   | Yellow | `bg-yellow-100`  | `border-yellow-300`| `text-yellow-800`|
| High       | Orange | `bg-orange-100`  | `border-orange-300`| `text-orange-800`|
| Critical   | Red    | `bg-red-100`     | `border-red-300`   | `text-red-800`   |
| Rugged     | Gray   | `bg-black/30`    | `border-gray-700`  | `text-gray-500`  |

## Events

### Listening to Badge Updates

```javascript
document.addEventListener('badgeupdate', (event) => {
    const { tokenMint, riskData, element, timestamp } = event.detail;
    console.log(`Badge updated for ${tokenMint}:`, riskData);
});
```

### RiskStore Integration

The renderer automatically subscribes to RiskStore events:

```javascript
// RiskStore fires 'riskchange' events
window.RiskStore.addEventListener('riskchange', (event) => {
    // Atomic renderer automatically handles this
    const { tokenMint, newRiskLevel, previousRiskLevel } = event.detail;
});
```

## Performance Optimizations

### Debouncing Strategy
- **Per-token debouncing**: Each token has its own timer
- **50ms delay**: Balances responsiveness with efficiency  
- **Timer cleanup**: Prevents memory leaks

### HTML Caching
- **Last rendered HTML**: Cached per token to avoid redundant updates
- **String comparison**: Fast innerHTML comparison
- **Memory efficient**: Only stores final HTML strings

### DOM Efficiency
- **Single DOM update**: Atomic innerHTML replacement
- **RequestAnimationFrame**: Optimal timing for visual updates
- **Minimal reflows**: Structured HTML prevents layout thrashing

## Integration with Existing Code

### Replacing Legacy renderBadge

The atomic renderer is designed to be a drop-in replacement:

```javascript
// Old way (replaced in real-time-risk.js)
function renderBadge(tokenMint) {
    const badgeElement = document.querySelector(`[data-risk-badge="${tokenMint}"]`);
    const riskData = window.RiskStore.getToken(tokenMint);
    const badge = createRealTimeRiskBadge(tokenMint, riskData);
    badgeElement.innerHTML = badge; // Can cause flicker
}

// New way (automatic via event system)
// Just update RiskStore, badges update automatically with debouncing
window.RiskStore.setSource(tokenMint, 'source', {
    riskLevel: 'High',
    riskScore: 75,
    rugged: false,
    monitoring: token.monitoring_active || false, // Include monitoring status
    metadata: { timestamp: new Date().toISOString() }
});
```

### Backward Compatibility

The old `renderBadge` function now delegates to the atomic renderer:

```javascript
function renderBadge(tokenMint) {
    if (window.atomicBadgeRenderer) {
        window.atomicBadgeRenderer.renderBadge(tokenMint);
        return;
    }
    // Fallback to legacy behavior
}
```

## Debugging

### Console Logging

The renderer provides detailed logging:

```
[AtomicBadgeRenderer] Initialized with debounce delay: 50ms
[AtomicBadgeRenderer] Registered riskchange event listener  
[AtomicBadgeRenderer] Updated badge for token123: {riskLevel: "High", riskScore: 75, ...}
[AtomicBadgeRenderer] No update needed for token456 - HTML unchanged
```

### Debug API

```javascript
// Check active timers
const activeTimers = window.atomicBadgeRenderer.getDebounceTimers();
console.log('Active debounce timers:', activeTimers.size);

// Check cached HTML
const cachedHTML = window.atomicBadgeRenderer.getLastRenderedHTML('token123');
console.log('Cached HTML length:', cachedHTML?.length || 'not cached');

// View configuration
console.log('Debounce delay:', window.atomicBadgeRenderer.DEBOUNCE_DELAY);
```

## Testing

See `examples/l` for a complete demo with:

- ✅ Burst event testing (debouncing)
- ✅ Rapid update testing (performance)  
- ✅ Visual flicker comparison
- ✅ Debug information display
- ✅ Real-time console output

## Error Handling

The renderer includes comprehensive error handling:

- **Missing badge elements**: Warns but doesn't crash
- **Invalid RiskStore data**: Graceful fallbacks
- **DOM errors**: Logged with context
- **Timer cleanup**: Prevents memory leaks

## Browser Compatibility

- **Modern browsers**: Full feature support
- **RequestAnimationFrame**: Falls back to setTimeout
- **EventTarget**: Native support in all modern browsers
- **Map/Set**: ES6 features required

## Migration Guide

1. **Include the script**: Add `atomic-badge-renderer.js` after `risk-store.js`
2. **Update HTML**: Ensure badge elements have `data-risk-badge` attributes  
3. **Remove manual calls**: Let the event system handle updates
4. **Test debouncing**: Verify burst events are properly collapsed
5. **Monitor performance**: Check for improved rendering efficiency

The atomic badge renderer provides a robust, efficient, and flicker-free solution for real-time risk badge updates while maintaining backward compatibility with existing code.
