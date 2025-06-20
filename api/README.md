# PanicSwap API Documentation

## Subscription Management Endpoints

### Overview
These endpoints handle subscription management for PanicSwap, supporting both cryptocurrency (Solana) and credit card (Stripe) payments.

### Prerequisites
1. Set up your database using the provided `schema.sql` file
2. Configure Stripe API keys in your `.env` file:
   ```
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

### API Endpoints

#### 1. Save Subscription
**Endpoint:** `POST /api/save-subscription.php`

**Description:** Saves subscription details after successful payment (primarily for crypto payments).

**Request Body:**
```json
{
  "wallet_address": "string (Solana wallet address)",
  "plan_type": "basic|pro|enterprise",
  "payment_method": "crypto|stripe",
  "amount": 29.00,
  "currency": "SOL|USDC|USD",
  "transaction_signature": "string (for crypto payments)",
  "stripe_session_id": "string (for Stripe payments)"
}
```

**Response:**
```json
{
  "success": true,
  "subscription_id": 123,
  "status": "active",
  "expires_at": "2024-02-20T12:00:00Z",
  "features": {
    "max_tokens": 20,
    "auto_protection": true,
    "priority_support": true,
    "advanced_analytics": true
  }
}
```

#### 2. Create Stripe Checkout Session
**Endpoint:** `POST /api/create-checkout-session.php`

**Description:** Creates a Stripe checkout session for USD payments.

**Request Body:**
```json
{
  "wallet_address": "string (Solana wallet address)",
  "plan_type": "basic|pro|enterprise",
  "email": "user@example.com (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
  "session_id": "cs_test_..."
}
```

#### 3. Stripe Webhook Handler
**Endpoint:** `POST /api/webhook-stripe.php`

**Description:** Handles Stripe webhook events. This endpoint should be configured in your Stripe dashboard.

**Headers Required:**
- `Stripe-Signature`: Webhook signature from Stripe

**Handled Events:**
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Response:**
```json
{
  "success": true
}
```

#### 4. Get Subscription Status
**Endpoint:** `GET /api/get-subscription-status.php`

**Description:** Checks the current subscription status for a wallet address.

**Query Parameters:**
- `wallet_address`: Solana wallet address

**Response (Active Subscription):**
```json
{
  "has_subscription": true,
  "subscription_id": 123,
  "plan_type": "pro",
  "status": "active",
  "features": {
    "max_tokens": 20,
    "auto_protection": true,
    "priority_support": true,
    "advanced_analytics": true,
    "custom_alerts": true
  },
  "expires_at": "2024-02-20T12:00:00Z",
  "days_remaining": 25,
  "created_at": "2024-01-20T12:00:00Z",
  "payment_method": "stripe",
  "usage": {
    "tokens_protected": 5,
    "max_tokens": 20
  }
}
```

**Response (No Subscription):**
```json
{
  "has_subscription": false,
  "plan_type": null,
  "features": {
    "max_tokens": 3,
    "auto_protection": false,
    "priority_support": false,
    "advanced_analytics": false,
    "custom_alerts": false,
    "api_access": false
  },
  "message": "No active subscription found"
}
```

### Plan Features

#### Basic Plan ($29/month)
- Monitor up to 5 tokens
- Auto-protection enabled
- Standard support

#### Pro Plan ($79/month)
- Monitor up to 20 tokens
- Auto-protection enabled
- Priority support
- Advanced analytics
- Custom alerts

#### Enterprise Plan ($199/month)
- Unlimited tokens
- Auto-protection enabled
- Priority support
- Advanced analytics
- Custom alerts
- API access
- Dedicated support

### Security Considerations

1. **CORS Headers**: All endpoints include proper CORS headers for cross-origin requests
2. **Input Validation**: All inputs are validated for format and content
3. **SQL Injection Protection**: Uses prepared statements via Supabase client
4. **Webhook Verification**: Stripe webhooks are verified using signature validation
5. **Service Keys**: Write operations use Supabase service keys for proper authorization

### Database Schema

The subscription system uses the following main tables:
- `subscriptions`: Stores subscription details
- `payment_history`: Audit trail of all payment-related events

See `schema.sql` for the complete database structure.

### Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `201`: Created (for new subscriptions)
- `400`: Bad Request (invalid input)
- `405`: Method Not Allowed
- `500`: Internal Server Error

Error responses include a JSON object with an `error` field:
```json
{
  "error": "Description of the error"
}
```

### Integration Example

```javascript
// Check subscription status
const checkSubscription = async (walletAddress) => {
  const response = await fetch(`/api/get-subscription-status.php?wallet_address=${walletAddress}`);
  const data = await response.json();
  return data;
};

// Create Stripe checkout session
const createCheckout = async (walletAddress, planType) => {
  const response = await fetch('/api/create-checkout-session.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      wallet_address: walletAddress,
      plan_type: planType
    })
  });
  const data = await response.json();
  if (data.success) {
    window.location.href = data.checkout_url;
  }
};

// Save crypto payment subscription
const saveCryptoSubscription = async (subscriptionData) => {
  const response = await fetch('/api/save-subscription.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscriptionData)
  });
  return await response.json();
};
```