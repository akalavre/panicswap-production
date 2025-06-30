# PanicSwap DigitalOcean Deployment Guide

## Quick Deployment (Copy & Paste)

### Option 1: Direct SSH Commands

1. **SSH into your droplet:**
```bash
ssh root@157.230.227.111
```

2. **Run the automated deployment script:**
```bash
# Download and execute the deployment script
curl -fsSL https://raw.githubusercontent.com/akalavre/PanicSwap-php/main/remote-deploy.sh -o /tmp/deploy.sh && \
chmod +x /tmp/deploy.sh && \
/tmp/deploy.sh
```

### Option 2: Manual Quick Setup

If the automated script fails, run these commands manually:

```bash
# 1. Update system and install dependencies
apt update && apt upgrade -y
apt install -y curl git nginx ufw wget

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker && systemctl enable docker

# 3. Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. Setup firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 3001/tcp
ufw --force enable

# 5. Download PanicSwap
mkdir -p /opt/panicswap && cd /opt/panicswap
wget -qO- https://github.com/akalavre/PanicSwap-php/archive/refs/heads/main.tar.gz | tar xz --strip-components=1

# 6. Create environment file with your keys
cat > .env << 'EOF'
# Helius Configuration
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=acf27094-f4d2-4318-b9e5-330735bfa6ae
HELIUS_API_KEY=acf27094-f4d2-4318-b9e5-330735bfa6ae

# Supabase Configuration
SUPABASE_URL=https://cfficjjdhgqwqprfhlrj.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk2MjQ5NywiZXhwIjoyMDY0NTM4NDk3fQ.GfeQTK4qjQJWLUYoiVJNuy3p2bx3nB3rX39oZ6hBgFE
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjI0OTcsImV4cCI6MjA2NDUzODQ5N30.9YJ2QLzXJl3m-0YK8qo2Z6kXd1DpSDxLr50A6QYWB_M

# Alchemy Configuration
ALCHEMY_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/6hT8LbsNwH7DLW3boPLkL

# Upstash Redis Configuration
REDIS_ENABLED=true
UPSTASH_REDIS_REST_URL=https://polite-oarfish-32536.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX8YAAIjcDE1ZjliMjhhZTM0YmY0ZWJiOTFmZDVlYzc3NTI0OGE3YXAxMA

# Telegram Configuration
TELEGRAM_BOT_TOKEN=7409630715:AAEHtMymSTQ0Wcfguv356aIcVfuF8eSd2z4
TELEGRAM_BOT_USERNAME=PanicSwap_Alerts_bot
TELEGRAM_CHAT_ID=-1002578145940

# Stripe Configuration (REPLACE THESE!)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_PUBLIC_KEY=pk_live_YOUR_STRIPE_PUBLIC_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET

# App Configuration
APP_URL=http://157.230.227.111
NODE_ENV=production
PORT=3001

# Security
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=OIw1/tUyBCZZkpQQL/8QSfKs1TBDT7hC6TQ1rEC+Sfk=

# RapidAPI (for PumpFun)
RAPIDAPI_KEY=569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22

# ML Configuration
ML_ENABLED=true
ML_UPDATE_INTERVAL_MS=45000

# Performance Settings
VELOCITY_POLL_INTERVAL=15000
PATTERN_CHECK_INTERVAL=15000
SOCIAL_MONITORING_INTERVAL=30000
TOKEN_REFRESH_MS=60000
EOF

# 7. Copy env to backend
mkdir -p backend && cp .env backend/.env

# 8. Setup Nginx
cat > /etc/nginx/sites-available/panicswap << 'NGINX'
server {
    listen 80;
    server_name 157.230.227.111;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/panicswap /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 9. Build and start Docker containers
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

echo "Deployment complete! Access your app at http://157.230.227.111"
```

## Important: Configure Stripe Keys

Before your application will work properly, you MUST update the Stripe keys in `/opt/panicswap/.env`:

1. **Get your Stripe keys from:** https://dashboard.stripe.com/apikeys
2. **Edit the environment file:**
   ```bash
   nano /opt/panicswap/.env
   ```
3. **Replace these placeholders:**
   - `STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET`

4. **Restart the application:**
   ```bash
   cd /opt/panicswap
   docker-compose -f docker-compose.production.yml restart
   ```

## Verify Deployment

```bash
# Check if containers are running
docker ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f

# Test the frontend
curl http://157.230.227.111

# Test the backend API
curl http://157.230.227.111/api/health
```

## Troubleshooting

If deployment fails:

```bash
# Check Docker logs
docker logs panicswap-frontend
docker logs panicswap-backend

# Check system logs
journalctl -xe

# Restart services
cd /opt/panicswap
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# Check port availability
netstat -tlnp | grep -E '80|443|3001|8080'
```

## Post-Deployment Setup

1. **Set up SSL (optional but recommended):**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```

2. **Configure Stripe webhooks:**
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint: `http://157.230.227.111/api/webhook/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.*`

3. **Monitor the application:**
   ```bash
   # Create monitoring script
   echo '#!/bin/bash
   docker-compose -f /opt/panicswap/docker-compose.production.yml ps
   docker stats --no-stream' > /usr/local/bin/panicswap-status
   chmod +x /usr/local/bin/panicswap-status
   
   # Run it
   panicswap-status
   ```

## Security Hardening

```bash
# 1. Create a non-root user
adduser panicswap
usermod -aG docker panicswap

# 2. Disable root SSH (after setting up SSH key for panicswap user)
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# 3. Setup fail2ban
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# 4. Regular updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```