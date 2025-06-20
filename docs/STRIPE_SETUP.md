# Stripe Setup Guide for PanicSwap

This guide will help you set up Stripe payments for your PanicSwap installation.

## Prerequisites

1. PHP 7.4 or higher
2. Composer installed
3. A Stripe account (create one at https://stripe.com)

## Step 1: Install Dependencies

Run the following command in your project root:

```bash
composer install
```

This will install:
- Stripe PHP SDK
- PHP dotenv for environment variables

## Step 2: Configure Stripe Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → API Keys
3. Copy your test keys (for development) or live keys (for production)
4. Update your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

## Step 3: Set Up Webhook Endpoint

1. In Stripe Dashboard, go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhook-stripe.php`
4. Select the following events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Update your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

## Step 4: Test the Integration

### Test Mode
1. Use Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - More test cards: https://stripe.com/docs/testing

2. Test the payment flow:
   - Go to your pricing page
   - Select a plan
   - Choose "Pay with USD"
   - Complete the Stripe checkout

3. Verify webhook handling:
   - Check your server logs for webhook events
   - Verify subscription is created in your database

### Stripe CLI (Optional)
For local testing, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost/api/webhook-stripe.php

# Trigger test events
stripe trigger checkout.session.completed
```

## Step 5: Going Live

When ready for production:

1. Switch to live keys in Stripe Dashboard
2. Update your `.env` file with live keys
3. Update webhook endpoint to use HTTPS
4. Test with a real card to ensure everything works

## Security Considerations

1. **Never commit API keys**: Ensure `.env` is in `.gitignore`
2. **Use HTTPS**: Always use HTTPS in production
3. **Verify webhooks**: The code already verifies webhook signatures
4. **PCI Compliance**: Stripe handles card data, but ensure your site is secure

## Subscription Management

### Customer Portal
Enable Stripe's Customer Portal for self-service subscription management:

1. Go to Settings → Billing → Customer Portal in Stripe Dashboard
2. Configure available actions (cancel, update payment method, etc.)
3. Activate the portal

### Handling Subscription Updates
The webhook handler automatically:
- Updates subscription status on creation/update
- Marks subscriptions as cancelled when deleted
- Logs payment failures
- Records all payment history

## Monitoring

1. **Stripe Dashboard**: Monitor payments and subscriptions
2. **Server Logs**: Check for webhook errors
3. **Database**: Verify subscription records are updated

## Troubleshooting

### Common Issues

1. **Webhook 400 errors**: Check webhook secret is correct
2. **Payment not recorded**: Verify webhook endpoint is accessible
3. **Subscription not activated**: Check database connection and queries

### Debug Mode
For debugging, temporarily add to webhook handler:

```php
error_log('Stripe Event: ' . json_encode($event));
```

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- PanicSwap Issues: https://github.com/panicswap/issues