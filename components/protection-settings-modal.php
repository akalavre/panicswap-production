<!-- Protection Settings Modal -->
<div id="protection-settings-modal" class="fixed inset-0 z-50 hidden">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" id="protection-settings-backdrop" onclick="event.target === this && closeProtectionSettingsModal()"></div>
    
    <!-- Modal Content -->
    <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
            <div class="relative danger-card max-w-md w-full my-8">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-800">
                <h3 class="text-xl font-semibold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings h-5 w-5 text-gray-400">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Protection Settings
                </h3>
                <button onclick="closeProtectionSettingsModal()" class="text-gray-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-6 w-6">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                    </svg>
                </button>
            </div>
            
            <!-- Body -->
            <div class="p-6">
                <!-- Token Info -->
                <div class="flex items-center gap-4 mb-6">
                    <!-- Token Icon -->
                    <div class="flex-shrink-0">
                        <img id="settings-token-icon" src="" alt="" class="h-12 w-12 rounded-full" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div id="settings-token-icon-placeholder" class="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center hidden">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coins h-6 w-6 text-gray-400">
                                <circle cx="8" cy="8" r="6"></circle>
                                <path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path>
                                <path d="M7 6h1v4"></path>
                                <path d="m16.71 13.88.7.71-2.82 2.82"></path>
                            </svg>
                        </div>
                    </div>
                    
                    <!-- Token Details -->
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span id="settings-token-symbol" class="text-lg font-semibold text-white">TOKEN</span>
                        </div>
                        <div id="settings-token-name" class="text-sm text-gray-400">Configure protection settings</div>
                    </div>
                </div>
                
                <!-- Settings Sections -->
                <div class="space-y-4">
                    <!-- Mempool Monitoring -->
                    <div class="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                <h4 class="text-sm font-medium text-white">Mempool Monitoring</h4>
                                <span class="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded-full">Premium</span>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="mempool-toggle" class="sr-only peer" onchange="updateMempoolSettings()">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600"></div>
                            </label>
                        </div>
                        <p class="text-xs text-gray-500">Real-time detection of rugpull transactions before they confirm</p>
                    </div>
                    
                    <!-- Risk Threshold -->
                    <div id="risk-threshold-section" class="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 transition-opacity">
                        <div class="flex items-center gap-2 mb-3">
                            <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <h4 class="text-sm font-medium text-white">Risk Threshold</h4>
                        </div>
                        <div class="grid grid-cols-4 gap-2">
                            <button type="button" class="risk-threshold-btn px-3 py-2 text-xs font-medium rounded-md border transition-all bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" data-threshold="low">
                                Low
                            </button>
                            <button type="button" class="risk-threshold-btn px-3 py-2 text-xs font-medium rounded-md border transition-all bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" data-threshold="medium">
                                Medium
                            </button>
                            <button type="button" class="risk-threshold-btn px-3 py-2 text-xs font-medium rounded-md border transition-all bg-gray-600 border-gray-600 text-white selected" data-threshold="high">
                                High
                            </button>
                            <button type="button" class="risk-threshold-btn px-3 py-2 text-xs font-medium rounded-md border transition-all bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" data-threshold="critical">
                                Critical
                            </button>
                        </div>
                        <p class="mt-2 text-xs text-gray-500">Lower thresholds trigger protection more frequently</p>
                    </div>
                    
                    <!-- Priority Fee -->
                    <div id="priority-fee-section" class="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 transition-opacity">
                        <div class="flex items-center gap-2 mb-3">
                            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            <h4 class="text-sm font-medium text-white">Priority Fee Multiplier</h4>
                        </div>
                        <div class="flex items-center gap-4">
                            <input type="range" id="priority-fee" min="1" max="5" step="0.5" value="1.5" 
                                   class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                   oninput="updatePriorityFeeDisplay(this.value)">
                            <span id="priority-fee-display" class="text-sm font-mono text-white bg-gray-700 px-3 py-1 rounded">1.5x</span>
                        </div>
                        <p class="mt-2 text-xs text-gray-500">Higher multipliers increase transaction priority during threats</p>
                    </div>
                </div>
                
                <!-- Info Message -->
                <div class="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 mt-6">
                    <div class="flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" x2="12" y1="16" y2="12"></line>
                            <line x1="12" x2="12.01" y1="8" y2="8"></line>
                        </svg>
                        <div>
                            <h4 class="text-sm font-medium text-gray-300 mb-1">Requirements</h4>
                            <p class="text-sm text-gray-400">Mempool monitoring requires backend service with Helius premium and pre-signed emergency transactions.</p>
                        </div>
                    </div>
                </div>
                
                <!-- Error Message (initially hidden) -->
                <div id="settings-error" class="hidden mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle h-4 w-4 text-red-400 flex-shrink-0">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="m15 9-6 6"></path>
                            <path d="m9 9 6 6"></path>
                        </svg>
                        <span id="settings-error-text" class="text-sm text-red-300"></span>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex gap-3 mt-6">
                    <!-- Cancel Button -->
                    <button id="cancel-settings-btn" onclick="closeProtectionSettingsModal()" 
                            class="flex-1 btn btn-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-4 w-4">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                        </svg>
                        Cancel
                    </button>
                    
                    <!-- Save Button -->
                    <button id="save-settings-btn" onclick="saveProtectionSettings()" 
                            class="flex-1 btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check h-4 w-4">
                            <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span id="save-button-text">Save Settings</span>
                    </button>
                </div>
            </div>
        </div>
        </div>
    </div>
</div>

<script>
// Current token being configured
let currentSettingsToken = null;

// Track if settings are being saved
let settingsSaveInProgress = false;

// Open protection settings modal
window.openProtectionSettings = function(tokenMint, tokenSymbol, currentSettings = {}, tokenName = '', tokenIcon = '') {
    // Don't allow opening if a save is in progress
    if (settingsSaveInProgress) {
        showNotification('Please wait for the current save to complete', 'info');
        return;
    }
    
    currentSettingsToken = tokenMint;
    
    // Update modal with token info
    document.getElementById('settings-token-symbol').textContent = tokenSymbol;
    document.getElementById('settings-token-name').textContent = tokenName || 'Configure protection settings';
    
    // Update token icon
    const iconImg = document.getElementById('settings-token-icon');
    const iconPlaceholder = document.getElementById('settings-token-icon-placeholder');
    
    if (tokenIcon) {
        iconImg.src = tokenIcon;
        iconImg.style.display = 'block';
        iconPlaceholder.style.display = 'none';
    } else {
        iconImg.style.display = 'none';
        iconPlaceholder.style.display = 'flex';
    }
    
    // Set current values
    const mempoolToggle = document.getElementById('mempool-toggle');
    mempoolToggle.checked = currentSettings.mempool_monitoring || false;
    
    // Update risk threshold selection
    document.querySelectorAll('.risk-threshold-btn').forEach(btn => {
        btn.classList.remove('selected', 'bg-gray-600', 'text-white');
        btn.classList.add('bg-gray-700', 'border-gray-600', 'text-gray-300');
        
        if (btn.dataset.threshold === (currentSettings.risk_threshold || 'high').toLowerCase()) {
            btn.classList.add('selected', 'bg-gray-600', 'text-white');
            btn.classList.remove('bg-gray-700', 'border-gray-600', 'text-gray-300');
        }
    });
    
    // Set priority fee
    const priorityFee = currentSettings.priority_fee_multiplier || 1.5;
    document.getElementById('priority-fee').value = priorityFee;
    updatePriorityFeeDisplay(priorityFee);
    
    // Update sections based on mempool state
    updateMempoolSettings();
    
    // Clear any previous errors
    const errorDiv = document.getElementById('settings-error');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
    
    // Show modal
    document.getElementById('protection-settings-modal').classList.remove('hidden');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeProtectionSettingsModal() {
    // Don't allow closing if save is in progress
    if (settingsSaveInProgress) {
        return;
    }
    
    document.getElementById('protection-settings-modal').classList.add('hidden');
    currentSettingsToken = null;
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Update UI when mempool toggle changes
function updateMempoolSettings() {
    const isEnabled = document.getElementById('mempool-toggle').checked;
    const riskSection = document.getElementById('risk-threshold-section');
    const feeSection = document.getElementById('priority-fee-section');
    
    if (isEnabled) {
        riskSection.classList.remove('opacity-50');
        feeSection.classList.remove('opacity-50');
    } else {
        riskSection.classList.add('opacity-50');
        feeSection.classList.add('opacity-50');
    }
}

// Update priority fee display
function updatePriorityFeeDisplay(value) {
    document.getElementById('priority-fee-display').textContent = value + 'x';
}

// Handle risk threshold button clicks
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('risk-threshold-btn')) {
        // Don't change if section is disabled
        if (e.target.closest('#risk-threshold-section')?.classList.contains('opacity-50')) {
            return;
        }
        
        document.querySelectorAll('.risk-threshold-btn').forEach(btn => {
            btn.classList.remove('selected', 'bg-gray-600', 'text-white');
            btn.classList.add('bg-gray-700', 'border-gray-600', 'text-gray-300');
        });
        
        e.target.classList.add('selected', 'bg-gray-600', 'text-white');
        e.target.classList.remove('bg-gray-700', 'border-gray-600', 'text-gray-300');
    }
});

// Handle backdrop click
document.getElementById('protection-settings-backdrop')?.addEventListener('click', closeProtectionSettingsModal);

// Handle ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('protection-settings-modal').classList.contains('hidden')) {
        closeProtectionSettingsModal();
    }
});

// Save settings
async function saveProtectionSettings() {
    if (!currentSettingsToken || settingsSaveInProgress) return;
    
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) {
        showSettingsError('Please connect your wallet first');
        return;
    }
    
    // Mark save as in progress globally
    settingsSaveInProgress = true;
    
    // Disable all settings buttons in the token list
    document.querySelectorAll('[data-protection-settings]').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    const saveBtn = document.getElementById('save-settings-btn');
    const cancelBtn = document.getElementById('cancel-settings-btn');
    const saveBtnText = document.getElementById('save-button-text');
    const originalText = saveBtnText.textContent;
    
    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    saveBtnText.innerHTML = `<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg><span class="ml-2">Saving...</span>`;
    
    try {
        const settings = {
            mempool_monitoring: document.getElementById('mempool-toggle').checked,
            risk_threshold: document.querySelector('.risk-threshold-btn.selected')?.dataset.threshold?.toUpperCase() || 'HIGH',
            priority_fee_multiplier: parseFloat(document.getElementById('priority-fee').value)
        };
        
        const response = await fetch('api/update-monitoring-settings.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token_mint: currentSettingsToken,
                wallet_address: walletAddress,
                settings: settings
            })
        });
        
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned non-JSON response. Check console for details.');
        }
        
        const data = await response.json();
        
        if (response.status === 429) {
            // Handle rate limit specifically
            const retryAfter = data.retry_after || 5;
            throw new Error(`${data.message || 'Rate limit exceeded'}. Please wait ${retryAfter} seconds.`);
        }
        
        if (data.success) {
            showNotification('Protection settings updated successfully', 'success');
            closeProtectionSettingsModal();
            
            // Update real-time risk display if available
            if (window.realTimeRisk && typeof window.realTimeRisk.updateTokenRiskDisplay === 'function') {
                window.realTimeRisk.updateTokenRiskDisplay(currentSettingsToken);
            }
            
            // Trigger a refresh of the token list if needed
            if (typeof window.loadTokensV3 === 'function') {
                window.loadTokensV3();
            }
        } else {
            throw new Error(data.error || 'Failed to update settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showSettingsError(error.message);
    } finally {
        // Reset save and cancel buttons
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        saveBtnText.textContent = originalText;
        
        // Mark save as complete and re-enable all settings buttons
        settingsSaveInProgress = false;
        document.querySelectorAll('[data-protection-settings]').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
        });
    }
}

// Show error in modal
function showSettingsError(message) {
    const errorDiv = document.getElementById('settings-error');
    const errorText = document.getElementById('settings-error-text');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }
}

// Notification helper
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-y-full ${
        type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' :
        type === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-400' :
        'bg-blue-500/20 border border-blue-500/30 text-blue-400'
    }`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            ${type === 'success' ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path></svg>' :
              type === 'error' ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle w-5 h-5"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>' :
              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info w-5 h-5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>'}
            <span>${message}</span>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.remove('translate-y-full');
        notification.classList.add('translate-y-0');
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('translate-y-0');
        notification.classList.add('translate-y-full');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
</script>

<style>
/* Risk threshold button transitions */
.risk-threshold-btn {
    transition: all 0.2s ease;
}

.risk-threshold-btn:hover:not(.selected) {
    background-color: rgb(75 85 99);
}

/* Slider styling */
#priority-fee::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: #6b7280;
    cursor: pointer;
    border-radius: 50%;
}

#priority-fee::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #6b7280;
    cursor: pointer;
    border-radius: 50%;
    border: none;
}

/* Animation removed - was causing modal to disappear */
</style>
<script>
// Ensure openProtectionSettings is available early
if (!window.openProtectionSettings) {
    console.warn('openProtectionSettings will be defined when modal loads');
}
</script>