// Payment configuration - loaded before payment.js
window.PaymentConfig = {
    // Use a public RPC endpoint that allows CORS
    SOLANA_RPC: "https://rpc.ankr.com/solana",
    MERCHANT_WALLET: "5kUXfkUbawYtMxvGJtfcZXDgf5FJ7YnxDqki9QMEiMtB",
    SOL_PRICE: 140,
    PLANS: {
        basic: {
            name: 'Basic',
            solPrice: 0,
            usdPrice: 0,
            weeklySOL: 0,
            weeklyUSD: 0,
            features: '1 token, Telegram alerts, < 5s response'
        },
        pro: {
            name: 'Pro',
            solPrice: 0.56,
            usdPrice: 79,
            weeklySOL: 0.141,
            weeklyUSD: 19.75,
            features: '5 tokens, < 2s response, Telegram alerts'
        },
        degen: {
            name: 'Degen Mode',
            solPrice: 1.06,
            usdPrice: 149,
            weeklySOL: 0.266,
            weeklyUSD: 37.25,
features: '10 tokens, < 1s response, Telegram alerts'
        },
        enterprise: {
            name: 'Enterprise',
            solPrice: 2.85,
            usdPrice: 399,
            weeklySOL: 0.713,
            weeklyUSD: 99.75,
features: '25 tokens, all DEXs, dedicated support, Telegram alerts'
        }
    }
};