<!-- Protection Settings Modal -->
<div id="protection-settings-modal" class="fixed inset-0 z-50 hidden overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 transition-opacity bg-black bg-opacity-75" aria-hidden="true" onclick="closeProtectionSettingsModal()"></div>

        <!-- Modal panel -->
        <div class="inline-block overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-800">
            <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div class="sm:flex sm:items-start">
                    <div class="flex-1">
                        <h3 class="text-lg font-medium leading-6 text-white" id="modal-title">
                            Protection Settings
                        </h3>
                        <div class="mt-2">
                            <p class="text-sm text-gray-400">
                                Configure advanced protection options for <span id="settings-token-symbol" class="font-semibold text-white"></span>
                            </p>
                        </div>
                        
                        <!-- Settings Form -->
                        <form id="protection-settings-form" class="mt-6 space-y-6">
                            <!-- Mempool Monitoring Toggle -->
                            <div class="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                                <div class="flex-1">
                                    <label for="mempool-toggle" class="text-sm font-medium text-white flex items-center gap-2">
                                        <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                        </svg>
                                        Mempool Monitoring
                                        <span class="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">Premium</span>
                                    </label>
                                    <p class="mt-1 text-xs text-gray-500">
                                        Real-time detection of rugpull transactions before they confirm
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="mempool-toggle" class="sr-only peer" onchange="updateMempoolSettings()">
                                    <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                            
                            <!-- Risk Threshold -->
                            <div id="risk-threshold-section" class="p-4 rounded-lg bg-gray-800/50 border border-gray-700 opacity-50 transition-opacity">
                                <label class="text-sm font-medium text-white block mb-3">
                                    Risk Threshold
                                </label>
                                <div class="grid grid-cols-4 gap-2">
                                    <button type="button" class="risk-threshold-btn px-3 py-2 text-xs font-medium rounded-md border transition-all" data-threshold="low">
                                        Low
                                    </button>
                                    <button type="button" class="risk-threshold-btn px-3 py-2 text-xs font-medium rounded-md border transition-all" data-threshold="medium">
                                        Medium
                                    </button>
                                    <button type="button" class="risk-threshold-btn px-3 py-2 text-xs font-medium rounded-md border transition-all selected" data-threshold="high">
                                        High
                                    </button>
                                    <button type="button" class="risk-threshold-btn px-3 py-2 text-xs font-medium rounded-md border transition-all" data-threshold="critical">
                                        Critical
                                    </button>
                                </div>
                                <p class="mt-2 text-xs text-gray-500">
                                    Lower thresholds trigger protection more frequently
                                </p>
                            </div>
                            
                            <!-- Priority Fee Multiplier -->
                            <div id="priority-fee-section" class="p-4 rounded-lg bg-gray-800/50 border border-gray-700 opacity-50 transition-opacity">
                                <label for="priority-fee" class="text-sm font-medium text-white block mb-3">
                                    Priority Fee Multiplier
                                </label>
                                <div class="flex items-center gap-4">
                                    <input type="range" id="priority-fee" min="1" max="5" step="0.5" value="1.5" 
                                           class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                           oninput="updatePriorityFeeDisplay(this.value)">
                                    <span id="priority-fee-display" class="text-sm font-mono text-white w-12 text-right">1.5x</span>
                                </div>
                                <p class="mt-2 text-xs text-gray-500">
                                    Higher multipliers increase transaction priority during threats
                                </p>
                            </div>
                            
                            <!-- Info Box -->
                            <div class="p-4 rounded-lg bg-blue-900/20 border border-blue-800/50">
                                <div class="flex gap-3">
                                    <svg class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <div class="text-xs text-blue-300">
                                        <p class="font-medium mb-1">Mempool monitoring requires:</p>
                                        <ul class="space-y-1 text-blue-400/80">
                                            <li>• Backend service running with Helius premium</li>
                                            <li>• Pre-signed emergency transactions</li>
                                            <li>• Active protection enabled on token</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Modal Actions -->
            <div class="px-4 py-3 bg-gray-800/50 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-700">
                <button type="button" id="save-settings-btn" 
                        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                        onclick="saveProtectionSettings()">
                    Save Settings
                </button>
                <button type="button" id="cancel-settings-btn"
                        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-800 text-base font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                        onclick="closeProtectionSettingsModal()">
                    Cancel
                </button>
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
function openProtectionSettings(tokenMint, tokenSymbol, currentSettings = {}) {
    // Don't allow opening if a save is in progress
    if (settingsSaveInProgress) {
        showNotification('Please wait for the current save to complete', 'info');
        return;
    }
    
    currentSettingsToken = tokenMint;
    
    // Update modal title
    document.getElementById('settings-token-symbol').textContent = tokenSymbol;
    
    // Set current values
    const mempoolToggle = document.getElementById('mempool-toggle');
    mempoolToggle.checked = currentSettings.mempool_monitoring || false;
    
    // Update risk threshold selection
    document.querySelectorAll('.risk-threshold-btn').forEach(btn => {
        btn.classList.remove('selected', 'bg-purple-600', 'border-purple-600', 'text-white');
        btn.classList.add('bg-gray-800', 'border-gray-600', 'text-gray-400');
        
        if (btn.dataset.threshold === (currentSettings.risk_threshold || 'high')) {
            btn.classList.add('selected', 'bg-purple-600', 'border-purple-600', 'text-white');
            btn.classList.remove('bg-gray-800', 'border-gray-600', 'text-gray-400');
        }
    });
    
    // Set priority fee
    const priorityFee = currentSettings.priority_fee_multiplier || 1.5;
    document.getElementById('priority-fee').value = priorityFee;
    updatePriorityFeeDisplay(priorityFee);
    
    // Update sections based on mempool state
    updateMempoolSettings();
    
    // Show modal
    document.getElementById('protection-settings-modal').classList.remove('hidden');
}

// Close modal
function closeProtectionSettingsModal() {
    // Don't allow closing if save is in progress
    if (settingsSaveInProgress) {
        return;
    }
    
    document.getElementById('protection-settings-modal').classList.add('hidden');
    currentSettingsToken = null;
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
        document.querySelectorAll('.risk-threshold-btn').forEach(btn => {
            btn.classList.remove('selected', 'bg-purple-600', 'border-purple-600', 'text-white');
            btn.classList.add('bg-gray-800', 'border-gray-600', 'text-gray-400');
        });
        
        e.target.classList.add('selected', 'bg-purple-600', 'border-purple-600', 'text-white');
        e.target.classList.remove('bg-gray-800', 'border-gray-600', 'text-gray-400');
    }
});

// Save settings
async function saveProtectionSettings() {
    if (!currentSettingsToken || settingsSaveInProgress) return;
    
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) {
        showNotification('Please connect your wallet first', 'error');
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
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    cancelBtn.disabled = true;
    
    try {
        const settings = {
            mempool_monitoring: document.getElementById('mempool-toggle').checked,
            risk_threshold: document.querySelector('.risk-threshold-btn.selected')?.dataset.threshold || 'high',
            priority_fee_multiplier: parseFloat(document.getElementById('priority-fee').value)
        };
        
        const response = await fetch('./api/update-monitoring-settings.php', {
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
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Protection settings updated successfully', 'success');
            closeProtectionSettingsModal();
            
            // Update real-time risk display if available
            if (window.realTimeRisk) {
                window.realTimeRisk.updateTokenRiskDisplay(currentSettingsToken);
            }
        } else {
            throw new Error(data.error || 'Failed to update settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Failed to save settings: ' + error.message, 'error');
    } finally {
        // Reset save and cancel buttons
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
        cancelBtn.disabled = false;
        
        // Mark save as complete and re-enable all settings buttons
        settingsSaveInProgress = false;
        document.querySelectorAll('[data-protection-settings]').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
        });
    }
}

// Notification helper
function showNotification(message, type = 'info') {
    if (window.showInAppNotification) {
        window.showInAppNotification(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}
</script>

<style>
.risk-threshold-btn {
    transition: all 0.2s ease;
}

.risk-threshold-btn:hover:not(.selected) {
    background-color: rgba(147, 51, 234, 0.1);
    border-color: rgba(147, 51, 234, 0.5);
}

#priority-fee::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: #9333ea;
    cursor: pointer;
    border-radius: 50%;
}

#priority-fee::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #9333ea;
    cursor: pointer;
    border-radius: 50%;
    border: none;
}
</style>