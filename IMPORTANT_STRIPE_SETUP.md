# IMPORTANT: Stripe Key Configuration

## Security Warning
NEVER commit API keys to version control. The secret key you provided has been exposed and should be regenerated immediately in your Stripe dashboard.

## Setup Instructions

1. **Regenerate Your Keys** (URGENT)
   - Go to https://dashboard.stripe.com/apikeys
   - Click "Roll key" next to your secret key to generate a new one
   - This will invalidate the exposed key

2. **Find Your Publishable Key**
   - In the same Stripe dashboard page
   - Copy the key that starts with `pk_live_`

3. **Update Your .env File**
   Add these to your `.env` file (NOT .env.example):
   ```
   STRIPE_SECRET_KEY=sk_live_[your_new_secret_key]
   STRIPE_PUBLISHABLE_KEY=pk_live_[your_publishable_key]
   ```

4. **Set Up Webhook Secret**
   - Go to https://dashboard.stripe.com/webhooks
   - Create a new endpoint: `https://yourdomain.com/api/webhook-stripe.php`
   - Copy the signing secret (starts with `whsec_`)
   - Add to .env: `STRIPE_WEBHOOK_SECRET=whsec_[your_webhook_secret]`

## Security Best Practices

1. **Never share secret keys** - Anyone with your secret key can charge customers
2. **Use environment variables** - Keep keys in .env file
3. **Add .env to .gitignore** - Prevent accidental commits
4. **Restrict API key scope** - Use restricted keys when possible
5. **Monitor for unauthorized use** - Check Stripe dashboard regularly

## Need Help?
Contact Stripe support if you need assistance with key management.