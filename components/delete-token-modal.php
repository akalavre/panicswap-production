<!-- Delete Token Modal -->
<div id="delete-token-modal" class="fixed inset-0 z-50 hidden overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" id="delete-token-backdrop"></div>
    
    <!-- Modal Content -->
    <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative danger-card max-w-md w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-800">
                <h3 class="text-xl font-semibold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2 h-5 w-5 text-red-400">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" x2="10" y1="11" y2="17"></line>
                        <line x1="14" x2="14" y1="11" y2="17"></line>
                    </svg>
                    Remove Token
                </h3>
                <button onclick="closeDeleteTokenModal()" class="text-gray-400 hover:text-white transition-colors">
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
                        <img id="delete-token-icon" src="" alt="" class="h-12 w-12 rounded-full" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div id="delete-token-icon-placeholder" class="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center hidden">
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
                            <!-- Token Symbol -->
                            <span id="delete-token-symbol" class="text-lg font-semibold text-white">TOKEN</span>
                        </div>
                        <!-- Token Name -->
                        <div id="delete-token-name" class="text-sm text-gray-400">Token Name</div>
                    </div>
                </div>
                
                <!-- Warning Message -->
                <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <div class="flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle h-5 w-5 text-red-400 mt-0.5 flex-shrink-0">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
                            <line x1="12" x2="12" y1="9" y2="13"></line>
                            <line x1="12" x2="12.01" y1="17" y2="17"></line>
                        </svg>
                        <div>
                            <h4 class="text-sm font-medium text-red-400 mb-1">Warning</h4>
                            <!-- Warning Text -->
                            <p id="delete-token-warning" class="text-sm text-red-300">
                                This will remove this token from your token list.
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Error Message (initially hidden) -->
                <div id="delete-token-error" class="hidden mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle h-4 w-4 text-red-400 flex-shrink-0">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="m15 9-6 6"></path>
                            <path d="m9 9 6 6"></path>
                        </svg>
                        <span id="delete-token-error-text" class="text-sm text-red-300"></span>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex gap-3">
                    <!-- Cancel Button -->
                    <button id="delete-token-cancel" onclick="closeDeleteTokenModal()" 
                            class="flex-1 btn btn-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-4 w-4">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                        </svg>
                        Cancel
                    </button>
                    
                    <!-- Delete Button -->
                    <button id="delete-token-confirm" onclick="confirmDeleteToken()" 
                            class="flex-1 btn btn-danger">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2 h-4 w-4">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            <line x1="10" x2="10" y1="11" y2="17"></line>
                            <line x1="14" x2="14" y1="11" y2="17"></line>
                        </svg>
                        <span id="delete-button-text">Delete</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>