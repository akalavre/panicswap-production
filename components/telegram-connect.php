<?php
// Telegram connection component for dashboard
$telegramBotUsername = getenv('TELEGRAM_BOT_USERNAME') ?: 'PanicSwap_Alerts_bot';
$telegramChannelLink = 'https://t.me/+YourChannelInviteLink'; // Replace with actual invite link
?>

<!-- Telegram Connection Card -->
<div id="telegram-alert-card" class="card-stat rounded-xl p-6">
    <div class="stat-glow" style="--glow-color: #0088cc;"></div>
    
    <!-- Not Connected State -->
    <div id="telegram-not-connected" class="telegram-state">
        <div class="flex items-center justify-between mb-3">
            <span class="text-gray-500 text-xs uppercase tracking-wider font-medium">Telegram Alerts</span>
            <div class="p-2 rounded-lg bg-blue-400/10">
                <svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
                </svg>
            </div>
        </div>
        <div class="mb-4">
            <div class="text-2xl font-bold text-white mb-1">Not Connected</div>
            <div class="text-xs text-gray-500">Get instant rugpull alerts</div>
        </div>
        <button onclick="openTelegramModal()" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
            </svg>
            <span>Connect Telegram</span>
        </button>
    </div>
    
    <!-- Connected State (Hidden by default) -->
    <div id="telegram-connected" class="telegram-state hidden">
        <div class="flex items-center justify-between mb-3">
            <span class="text-gray-500 text-xs uppercase tracking-wider font-medium">Telegram Alerts</span>
            <div class="p-2 rounded-lg bg-green-400/10">
                <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
        </div>
        <div class="mb-4">
            <div class="text-2xl font-bold text-white mb-1">Connected</div>
            <div class="text-xs text-green-400">Alerts active</div>
        </div>
        <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500">Status</span>
                <span class="text-green-400">● Active</span>
            </div>
            <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500">Channel</span>
                <a href="<?php echo htmlspecialchars($telegramChannelLink); ?>" target="_blank" class="text-blue-400 hover:text-blue-300">
                    @<?php echo htmlspecialchars($telegramBotUsername); ?>
                </a>
            </div>
        </div>
        <button onclick="disconnectTelegram()" class="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-lg transition-all duration-200 text-xs">
            Disconnect
        </button>
    </div>
</div>

<!-- Telegram Connection Modal -->
<div id="telegram-modal" class="fixed inset-0 z-50 hidden">
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm" onclick="closeTelegramModal()"></div>
    <div class="fixed inset-0 flex items-center justify-center p-4">
        <div class="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-800 shadow-2xl">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-white">Connect Telegram Alerts</h3>
                <button onclick="closeTelegramModal()" class="text-gray-400 hover:text-white">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="space-y-4">
                <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p class="text-sm text-blue-400 mb-2">Get instant alerts when:</p>
                    <ul class="text-xs text-gray-400 space-y-1">
                        <li>• Rugpull detected on your protected tokens</li>
                        <li>• Emergency swap executed</li>
                        <li>• Significant price movements</li>
                        <li>• Protection status changes</li>
                    </ul>
                </div>
                
                <div class="space-y-3">
                    <h4 class="text-sm font-semibold text-white">Follow these steps:</h4>
                    
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-bold">1</div>
                        <div class="flex-1">
                            <p class="text-sm text-gray-300">Click to connect your wallet</p>
                            <a id="telegram-bot-link" href="#" target="_blank" class="inline-flex items-center space-x-2 mt-1 text-blue-400 hover:text-blue-300 text-xs">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
                                </svg>
                                <span>Connect with Telegram</span>
                            </a>
                        </div>
                    </div>
                    
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-bold">2</div>
                        <div class="flex-1">
                            <p class="text-sm text-gray-300">The bot will open automatically</p>
                            <p class="text-xs text-gray-500 mt-1">Your wallet will be linked securely</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-bold">3</div>
                        <div class="flex-1">
                            <p class="text-sm text-gray-300">Return here and click "Verify"</p>
                            <p class="text-xs text-gray-500 mt-1">Complete the connection process</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-800 rounded-lg p-4 mt-4">
                    <p class="text-xs text-gray-400 text-center">
                        Your wallet address will be linked to your Telegram account for personalized alerts
                    </p>
                </div>
                
                <button id="verify-telegram-btn" onclick="verifyTelegramConnection()" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200">
                    I've Connected - Verify
                </button>
                
                <div id="connection-status" class="hidden mt-3 text-center">
                    <div class="text-sm text-gray-400">
                        <span class="inline-flex items-center">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Waiting for bot connection...
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
function openTelegramModal() {
    // Get wallet address and update the deep link
    const walletAddress = window.walletAdapter?.publicKey?.toString();
    if (walletAddress) {
        const botLink = document.getElementById('telegram-bot-link');
        botLink.href = `https://t.me/<?php echo htmlspecialchars($telegramBotUsername); ?>?start=${walletAddress}`;
    }
    document.getElementById('telegram-modal').classList.remove('hidden');
}

function closeTelegramModal() {
    document.getElementById('telegram-modal').classList.add('hidden');
}

async function verifyTelegramConnection() {
    // Show loading state
    const button = document.getElementById('verify-telegram-btn');
    const statusDiv = document.getElementById('connection-status');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
    statusDiv.classList.remove('hidden');
    
    // First, manually check for updates (for local development without webhook)
    try {
        const manualCheck = await fetch('api/telegram-manual-check.php');
        const manualResult = await manualCheck.json();
        console.log('Manual check result:', manualResult);
    } catch (error) {
        console.log('Manual check failed, continuing with normal flow');
    }
    
    // Start polling for connection status
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 2000; // Check every 2 seconds
    
    const checkConnection = async () => {
        try {
            // Get wallet address
            const walletAddress = window.walletAdapter?.publicKey?.toString();
            if (!walletAddress) {
                throw new Error('Please connect your wallet first');
            }
            
            // Call API to verify connection
            const response = await fetch('api/connect-telegram.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    walletAddress: walletAddress,
                    action: 'verify'
                })
            });
            
            // Check if response is OK
            if (!response.ok) {
                console.error('Response status:', response.status, response.statusText);
                const text = await response.text();
                console.error('Response body:', text);
                throw new Error(`Server error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.connected) {
                // Update UI to show connected state
                document.getElementById('telegram-not-connected').classList.add('hidden');
                document.getElementById('telegram-connected').classList.remove('hidden');
                closeTelegramModal();
                
                // Show success notification
                if (window.showNotification) {
                    window.showNotification('Telegram connected successfully!', 'success');
                }
                
                // Send test message to channel
                sendTestAlert(walletAddress);
                
                // Hide status message
                statusDiv.classList.add('hidden');
                button.disabled = false;
                button.innerHTML = originalText;
                return true; // Connection successful
            } else {
                // Connection not found yet, continue polling
                attempts++;
                if (attempts >= maxAttempts) {
                    statusDiv.classList.add('hidden');
                    button.disabled = false;
                    button.innerHTML = originalText;
                    throw new Error('Connection timeout. Please make sure you clicked "Start" in the Telegram bot.');
                }
                // Continue polling
                setTimeout(checkConnection, pollInterval);
                return false;
            }
        } catch (error) {
            console.error('Telegram connection error:', error);
            statusDiv.classList.add('hidden');
            button.disabled = false;
            button.innerHTML = originalText;
            if (window.showNotification) {
                window.showNotification(error.message, 'error');
            }
            return false;
        }
    };
    
    // Start the polling
    checkConnection();
}

async function disconnectTelegram() {
    if (!confirm('Are you sure you want to disconnect Telegram alerts?')) {
        return;
    }
    
    try {
        const walletAddress = window.walletAdapter?.publicKey?.toString();
        if (!walletAddress) {
            throw new Error('Wallet not connected');
        }
        
        const response = await fetch('api/connect-telegram.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                walletAddress: walletAddress,
                action: 'disconnect'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update UI to show disconnected state
            document.getElementById('telegram-connected').classList.add('hidden');
            document.getElementById('telegram-not-connected').classList.remove('hidden');
            
            if (window.showNotification) {
                window.showNotification('Telegram disconnected', 'info');
            }
        }
    } catch (error) {
        console.error('Disconnect error:', error);
        if (window.showNotification) {
            window.showNotification('Failed to disconnect', 'error');
        }
    }
}

// Check connection status on load
async function checkTelegramConnection() {
    try {
        const walletAddress = window.walletAdapter?.publicKey?.toString();
        if (!walletAddress) return;
        
        const response = await fetch('api/connect-telegram.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                walletAddress: walletAddress,
                action: 'check'
            })
        });
        
        const result = await response.json();
        
        if (result.connected) {
            document.getElementById('telegram-not-connected').classList.add('hidden');
            document.getElementById('telegram-connected').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to check Telegram connection:', error);
    }
}

// Send test alert to Telegram
async function sendTestAlert(walletAddress) {
    try {
        const response = await fetch('api/send-test-alert.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                walletAddress: walletAddress
            })
        });
    } catch (error) {
        console.log('Test alert sent');
    }
}

// Check on wallet connection
if (window.walletAdapter) {
    window.walletAdapter.on('connect', checkTelegramConnection);
    // Also check immediately if wallet is already connected
    if (window.walletAdapter.publicKey) {
        checkTelegramConnection();
    }
}

// Also check on page load after a short delay (to ensure wallet adapter is initialized)
window.addEventListener('load', () => {
    setTimeout(checkTelegramConnection, 1000);
});
</script>