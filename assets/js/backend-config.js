// Backend configuration
// This file configures the backend URL for all API calls

// Set this to your backend URL
// If running locally, this should be http://localhost:3001
// If deployed, update this to your backend domain
window.BACKEND_URL = 'http://localhost:3001';

// You can also set this dynamically based on environment
// For example:
// window.BACKEND_URL = window.location.hostname === 'localhost' 
//     ? 'http://localhost:3001' 
//     : 'https://api.yourdomain.com';

console.log('[Backend Config] Using backend URL:', window.BACKEND_URL);