// Protection Events Module - Handles Supabase realtime subscriptions for emergency swaps
// This module requires Supabase client to be loaded via CDN

class ProtectionEvents {
    constructor() {
        this.supabase = null;
        this.channel = null;
        this.walletAddress = null;
        this.isInitialized = false;
    }

    // Initialize Supabase client and channel
    async init(walletAddress) {
        if (!walletAddress) {
            throw new Error('Wallet address required for protection events');
        }

        // Get Supabase credentials from global config
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            throw new Error('Supabase credentials not found');
        }

        this.walletAddress = walletAddress;
        // Use global supabase from CDN
        if (window.supabase && window.supabase.createClient) {
            this.supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        } else {
            throw new Error('Supabase library not loaded');
        }
        
        // Subscribe to protection events for this wallet
        await this.subscribeToProtectionEvents();
        this.isInitialized = true;
    }

    // Subscribe to protection events channel
    async subscribeToProtectionEvents() {
        // Unsubscribe from existing channel if any
        if (this.channel) {
            await this.channel.unsubscribe();
        }

        // Create channel for this wallet's protection events
        this.channel = this.supabase
            .channel(`protection:${this.walletAddress}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'protection_events',
                    filter: `wallet_address=eq.${this.walletAddress}`
                },
                async (payload) => {
                    await this.handleProtectionEvent(payload);
                }
            )
            .subscribe();

        console.log(`Subscribed to protection events for wallet: ${this.walletAddress}`);
    }

    // Handle incoming protection events
    async handleProtectionEvent(payload) {
        const event = payload.new;
        console.log('Protection event received:', event);

        switch (event.event_type) {
            case 'swap_pending':
                await this.handleSwapPending(event);
                break;
            
            case 'protected':
                this.handleProtected(event);
                break;
            
            case 'protection_failed':
                this.handleProtectionFailed(event);
                break;
                
            case 'swap_ready_to_sign':
                await this.handleSwapReadyToSign(event);
                break;
            
            default:
                console.warn('Unknown protection event type:', event.event_type);
        }
    }

    // Handle swap_ready_to_sign event - display modal for user signature
    async handleSwapReadyToSign(event) {
        try {
            const eventData = event.event_data;
            
            if (!eventData.serialized_tx) {
                throw new Error('No transaction data in swap_ready_to_sign event');
            }

            // Show transaction details in modal
            this.showTransactionModal(eventData, event.id);

        } catch (error) {
            console.error('Failed to handle swap_ready_to_sign:', error);
            showNotification(`Failed to show transaction: ${error.message}`, 'error');
        }
    }

    // Show transaction details in a modal
    showTransactionModal(eventData, eventId = null) {
        // Remove any existing modal
        const existingModal = document.getElementById('transaction-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML with enhanced styling
        const modalHTML = `
            <div class="modal fade" id="transaction-modal" tabindex="-1" data-bs-backdrop="static">
                <style>
                    #transaction-modal .modal-content {
                        border: 2px solid #ffc107;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                    #transaction-modal .alert {
                        border: none;
                        font-weight: 500;
                    }
                    #transaction-modal .badge {
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                        100% { transform: scale(1); }
                    }
                </style>
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                Emergency Swap Ready
                            </h5>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-warning">
                                <strong>Urgent:</strong> A rug pull has been detected! 
                                Your transaction is ready to be signed to protect your funds.
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Token Details:</h6>
                                    <p><strong>Symbol:</strong> ${eventData.token_symbol || 'Unknown'}</p>
                                    <p><strong>Amount:</strong> ${eventData.amount_in || 'Unknown'}</p>
                                    <p><strong>Estimated SOL:</strong> ${eventData.estimated_sol_out || 'Unknown'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Protection Details:</h6>
                                    <p><strong>Slippage:</strong> ${eventData.slippage_bps ? (eventData.slippage_bps / 100) + '%' : '5%'}</p>
                                    <p><strong>Priority Fee:</strong> ${eventData.priority_fee || 'Standard'}</p>
                                    <p><strong>Risk Level:</strong> <span class="badge bg-danger">Critical</span></p>
                                </div>
                            </div>
                            
                            <div class="alert alert-info mt-3">
                                <small>
                                    <i class="fas fa-info-circle me-1"></i>
                                    This transaction will swap your tokens to SOL to protect against rug pull losses.
                                    You can review and approve this transaction in your wallet.
                                </small>
                            </div>
                            
                            <div id="transaction-status" class="mt-3"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" id="reject-btn">
                                <i class="fas fa-times me-1"></i>Reject
                            </button>
                            <button type="button" class="btn btn-warning" id="sign-btn">
                                <i class="fas fa-signature me-1"></i>Sign & Protect
                            </button>
                            <button type="button" class="btn btn-primary d-none" id="retry-btn">
                                <i class="fas fa-redo me-1"></i>Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Get modal element and show it
        const modal = new bootstrap.Modal(document.getElementById('transaction-modal'));
        modal.show();

        // Add event listeners
        this.setupModalEventListeners(eventData.serialized_tx, modal, eventId);
    }

    // Setup event listeners for the transaction modal
    setupModalEventListeners(serializedTx, modal, eventId = null) {
        const signBtn = document.getElementById('sign-btn');
        const rejectBtn = document.getElementById('reject-btn');
        const retryBtn = document.getElementById('retry-btn');
        const statusDiv = document.getElementById('transaction-status');

        // Sign button handler
        signBtn.addEventListener('click', async () => {
            signBtn.disabled = true;
            signBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Signing...';
            
            statusDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin me-2"></i>Signing transaction...</div>';
            
            try {
                await this.attemptTransactionSign(serializedTx, eventId);
                
                // Success - close modal after a delay
                statusDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check me-2"></i>Transaction signed successfully!</div>';
                
                setTimeout(() => {
                    modal.hide();
                }, 2000);
                
            } catch (error) {
                // Show error and enable retry
                statusDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-times me-2"></i>Transaction failed: ${error.message}
                    </div>
                `;
                
                // Show retry button, hide sign button
                signBtn.classList.add('d-none');
                retryBtn.classList.remove('d-none');
            }
        });

        // Reject button handler
        rejectBtn.addEventListener('click', () => {
            statusDiv.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Transaction rejected by user.</div>';
            
            showNotification('Emergency swap rejected. Your funds remain at risk.', 'warning');
            
            setTimeout(() => {
                modal.hide();
            }, 1500);
        });

        // Retry button handler
        retryBtn.addEventListener('click', async () => {
            retryBtn.disabled = true;
            retryBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Retrying...';
            
            statusDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin me-2"></i>Retrying transaction...</div>';
            
            try {
                await this.attemptTransactionSign(serializedTx, eventId);
                
                // Success - close modal after a delay
                statusDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check me-2"></i>Transaction signed successfully!</div>';
                
                setTimeout(() => {
                    modal.hide();
                }, 2000);
                
            } catch (error) {
                // Show error - reset retry button
                statusDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-times me-2"></i>Retry failed: ${error.message}
                    </div>
                `;
                
                retryBtn.disabled = false;
                retryBtn.innerHTML = '<i class="fas fa-redo me-1"></i>Retry';
            }
        });

        // Clean up modal when hidden
        document.getElementById('transaction-modal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('transaction-modal').remove();
        });
    }

    // Attempt to sign a transaction
    async attemptTransactionSign(serializedTx, eventId = null) {
        try {
            // Check if the wallet is connected
            if (!walletAdapter.connected) {
                throw new Error('Wallet not connected');
            }

            // Sign and send the transaction
            const signature = await walletAdapter.signAndSendRawTransaction(serializedTx);
            
            // Show success notification
            showNotification('Transaction signed and sent!', 'success');

            // If we have an event ID, confirm the swap with the backend
            if (eventId) {
                try {
                    await this.confirmSwap(eventId, signature);
                    showNotification('Emergency swap confirmed and being tracked!', 'success');
                } catch (confirmError) {
                    console.error('Failed to confirm swap with backend:', confirmError);
                    // Don't throw here since the transaction was successful
                    showNotification('Transaction sent but confirmation failed. Please verify manually.', 'warning');
                }
            }

            return signature;
            
        } catch (error) {
            console.error('Transaction signing failed:', error);
            showNotification(`Transaction failed: ${error.message}`, 'error');
            throw error; // Re-throw for modal error handling
        }
    }

    // Handle swap_pending event - requires user signature
    async handleSwapPending(event) {
        try {
            const eventData = event.event_data;
            
            if (!eventData.serialized_tx) {
                throw new Error('No transaction data in swap_pending event');
            }

            // Check if wallet is connected
            if (!walletAdapter.connected) {
                console.error('Wallet not connected, cannot sign transaction');
                showNotification('Please connect your wallet to approve the emergency swap', 'error');
                return;
            }

            // Show notification
            showNotification('Rug pull detected! Approve the emergency swap to protect your funds.', 'warning');

            // Sign and send the transaction
            const signature = await walletAdapter.signAndSendRawTransaction(eventData.serialized_tx);
            
            // Confirm the swap with backend
            await this.confirmSwap(event.id, signature);
            
            showNotification('Emergency swap approved! Your funds are being protected.', 'success');
            
        } catch (error) {
            console.error('Failed to handle swap_pending:', error);
            showNotification(`Failed to approve emergency swap: ${error.message}`, 'error');
        }
    }

    // Confirm swap completion with backend
    async confirmSwap(eventId, signature) {
        const response = await fetch('api/protection/swap/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_id: eventId,
                signature: signature,
                wallet_address: this.walletAddress
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to confirm swap');
        }

        return response.json();
    }

    // Handle successful protection
    handleProtected(event) {
        const eventData = event.event_data;
        const message = `Protected! Swapped ${eventData.amount_in} ${eventData.token_symbol} to ${eventData.amount_out} SOL`;
        showNotification(message, 'success');
        
        // Emit event for UI updates
        window.dispatchEvent(new CustomEvent('protection:success', { detail: event }));
    }

    // Handle failed protection
    handleProtectionFailed(event) {
        const eventData = event.event_data;
        const message = `Protection failed: ${eventData.error || 'Unknown error'}`;
        showNotification(message, 'error');
        
        // Emit event for UI updates
        window.dispatchEvent(new CustomEvent('protection:failed', { detail: event }));
    }


    // Cleanup and unsubscribe
    async cleanup() {
        if (this.channel) {
            await this.channel.unsubscribe();
            this.channel = null;
        }
        this.isInitialized = false;
    }
}

// Create singleton instance
const protectionEvents = new ProtectionEvents();

// Make available globally
window.protectionEvents = protectionEvents;

// Development: Test function to simulate swap_ready_to_sign event
window.testSwapReadyToSign = function() {
    const testEvent = {
        id: 'test-event-' + Date.now(),
        event_type: 'swap_ready_to_sign',
        wallet_address: protectionEvents.walletAddress || 'test-wallet',
        token_mint: 'TestToken123...',
        event_data: {
            serialized_tx: 'base64-encoded-transaction-data',
            token_symbol: 'TEST',
            amount_in: '1000000',
            estimated_sol_out: '0.1',
            slippage_bps: 500,
            priority_fee: 'High'
        }
    };
    
    console.log('Testing swap_ready_to_sign event:', testEvent);
    protectionEvents.handleSwapReadyToSign(testEvent);
};

// Development: Add test button to UI if not exists
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Only add test button in development
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
            const testBtn = document.createElement('button');
            testBtn.textContent = 'Test Swap Ready';
            testBtn.className = 'btn btn-outline-primary btn-sm';
            testBtn.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999;';
            testBtn.onclick = window.testSwapReadyToSign;
            document.body.appendChild(testBtn);
        }
    });
}
