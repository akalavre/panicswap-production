#!/bin/bash
# One-line deployment command for PanicSwap
# Run this on your droplet: curl -fsSL https://raw.githubusercontent.com/yourusername/panicswap/main/one-line-deploy.sh | bash

set -e

echo "=== PanicSwap Automated Deployment ==="
echo "Deploying to $(hostname -I | awk '{print $1}')"
echo

# Update system
apt update && apt upgrade -y

# Install prerequisites
apt install -y curl git nginx ufw wget unzip

# Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Start Docker
systemctl start docker
systemctl enable docker

# Setup firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw --force enable

# Create app directory
mkdir -p /opt/panicswap
cd /opt/panicswap

# Download application
echo "Downloading PanicSwap application..."
if [ ! -d ".git" ]; then
    git clone https://github.com/akalavre/panicswap-production.git . || {
        # Fallback to wget if git fails
        wget -qO- https://github.com/akalavre/PanicSwap-php/archive/refs/heads/main.tar.gz | tar xz --strip-components=1
    }
fi

# Create production environment file
cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://cfficjjdhgqwqprfhlrj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NjQwMTUsImV4cCI6MjA1MDE0MDAxNX0.yzotHIIuDQD5ItRvbJouHXBusO5YhC7reFRKc3U5aTI
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MzQ1NjQwMTUsImV4cCI6MjA1MDE0MDAxNX0.B3M1CHICcyAqZlHuypPxRP-CmgotcrzP8LAOLmxvtHE

# Helius Configuration
HELIUS_API_KEY=59c732de-1ad6-4c48-834f-aa6a90b06e8d
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=59c732de-1ad6-4c48-834f-aa6a90b06e8d

# Stripe Configuration (UPDATE THESE!)
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_KEY
STRIPE_PUBLIC_KEY=pk_test_REPLACE_WITH_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_SECRET

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)

# App Configuration
APP_URL=http://157.230.227.111
NODE_ENV=production
PORT=3001

# Redis Configuration (Upstash)
REDIS_ENABLED=true
UPSTASH_REDIS_REST_URL=https://closing-anchovy-26116.upstash.io
UPSTASH_REDIS_REST_TOKEN=AW5MAAIncDEzMGFlODUzYjQ3OWE0NTBkYTZhMjI3MzEwNTFiZDFkMXAxMjYxMTY

# Telegram Configuration
TELEGRAM_BOT_TOKEN=7901450197:AAFbTPHy4hS83Ut7F83Yq0UzrxjP4jFhhRo

# RapidAPI (for PumpFun)
RAPIDAPI_KEY=569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22

# Alchemy Fallback RPC
ALCHEMY_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/wD6F0K0ST4wj8JBmMsT5qb47oN3Dm7Mj

# ML Service Configuration
ML_ENABLED=true
ML_UPDATE_INTERVAL_MS=45000
EOF

# Copy .env to backend
mkdir -p backend
cp .env backend/.env

# Configure Nginx
cat > /etc/nginx/sites-available/panicswap << 'NGINX'
server {
    listen 80;
    server_name 157.230.227.111;
    client_max_body_size 100M;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /api/ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/panicswap /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Create systemd service
cat > /etc/systemd/system/panicswap.service << 'SYSTEMD'
[Unit]
Description=PanicSwap Docker Application
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/panicswap
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
ExecReload=/usr/local/bin/docker-compose -f docker-compose.production.yml restart
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable panicswap

# Build and start application
echo "Building Docker containers..."
docker-compose -f docker-compose.production.yml build

echo "Starting PanicSwap..."
systemctl start panicswap

# Wait for services to start
sleep 10

# Check status
docker-compose -f docker-compose.production.yml ps

echo
echo "=== Deployment Complete! ==="
echo
echo "PanicSwap is now running at: http://157.230.227.111"
echo
echo "Important: Update your Stripe keys in /opt/panicswap/.env"
echo
echo "Commands:"
echo "- View logs: docker-compose -f /opt/panicswap/docker-compose.production.yml logs -f"
echo "- Restart: systemctl restart panicswap"
echo "- Status: docker ps"
echo
echo "Your JWT Secret: $(grep JWT_SECRET /opt/panicswap/.env | cut -d'=' -f2)"