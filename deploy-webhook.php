<?php
// Web-based deployment trigger
// Access this file from your browser to trigger deployment

header('Content-Type: text/plain');

// Security token (change this!)
$deployToken = 'panicswap-deploy-2024';

// Check token
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    http_response_code(403);
    die("Unauthorized\n");
}

echo "=== PanicSwap Remote Deployment ===\n\n";

// Deployment configuration
$dropletIP = '157.230.227.111';
$deployScript = <<<'BASH'
#!/bin/bash
set -e

echo "Starting deployment..."

# Update system
apt update && apt upgrade -y
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
systemctl start docker && systemctl enable docker

# Configure firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 3001/tcp
ufw --force enable

# Setup application
mkdir -p /opt/panicswap && cd /opt/panicswap

# Download application
rm -rf *
wget -qO- https://github.com/akalavre/PanicSwap-php/archive/refs/heads/main.tar.gz | tar xz --strip-components=1

# Create environment file
cat > .env << 'EOF'
SUPABASE_URL=https://cfficjjdhgqwqprfhlrj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NjQwMTUsImV4cCI6MjA1MDE0MDAxNX0.yzotHIIuDQD5ItRvbJouHXBusO5YhC7reFRKc3U5aTI
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MzQ1NjQwMTUsImV4cCI6MjA1MDE0MDAxNX0.B3M1CHICcyAqZlHuypPxRP-CmgotcrzP8LAOLmxvtHE
HELIUS_API_KEY=59c732de-1ad6-4c48-834f-aa6a90b06e8d
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=59c732de-1ad6-4c48-834f-aa6a90b06e8d
STRIPE_SECRET_KEY=sk_test_UPDATE_ME
STRIPE_PUBLISHABLE_KEY=pk_test_UPDATE_ME
STRIPE_PUBLIC_KEY=pk_test_UPDATE_ME
STRIPE_WEBHOOK_SECRET=whsec_UPDATE_ME
JWT_SECRET=fJ8aK2mN4pQ6sT8vX1yB3dG5hL7kM9nR
APP_URL=http://157.230.227.111
NODE_ENV=production
PORT=3001
REDIS_ENABLED=true
UPSTASH_REDIS_REST_URL=https://closing-anchovy-26116.upstash.io
UPSTASH_REDIS_REST_TOKEN=AW5MAAIncDEzMGFlODUzYjQ3OWE0NTBkYTZhMjI3MzEwNTFiZDFkMXAxMjYxMTY
TELEGRAM_BOT_TOKEN=7901450197:AAFbTPHy4hS83Ut7F83Yq0UzrxjP4jFhhRo
RAPIDAPI_KEY=569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22
ALCHEMY_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/wD6F0K0ST4wj8JBmMsT5qb47oN3Dm7Mj
ML_ENABLED=true
ML_UPDATE_INTERVAL_MS=45000
EOF

# Copy to backend
mkdir -p backend
cp .env backend/.env

# Configure Nginx
cat > /etc/nginx/sites-available/panicswap << 'NGINX'
server {
    listen 80;
    server_name 157.230.227.111;
    client_max_body_size 100M;

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
    }
}
NGINX

ln -sf /etc/nginx/sites-available/panicswap /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# Build and start
docker-compose -f docker-compose.production.yml down || true
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

echo "Deployment complete!"
BASH;

// Save script to temp file
$scriptFile = tempnam(sys_get_temp_dir(), 'deploy');
file_put_contents($scriptFile, $deployScript);

echo "Deployment script created.\n\n";
echo "To deploy, run this command on your droplet:\n\n";
echo "curl -fsSL http://your-server.com/deploy-webhook.php?token=$deployToken | ssh root@$dropletIP bash\n\n";
echo "Or SSH into your droplet and run:\n";
echo "wget -qO- http://your-server.com/deploy-webhook.php?token=$deployToken | bash\n\n";

// Output the script for manual copy/paste
echo "--- DEPLOYMENT SCRIPT ---\n";
echo $deployScript;
echo "\n--- END SCRIPT ---\n";

// Clean up
unlink($scriptFile);