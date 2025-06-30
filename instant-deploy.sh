#!/bin/bash
# PanicSwap Instant Deploy Script
# Upload this file to your droplet and run: bash instant-deploy.sh

set -e

echo "=== PanicSwap Instant Deployment ==="
echo "This script will completely set up PanicSwap on this server"
echo

# Create a function for colored output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} $1"
}

# System update
log "Updating system packages..."
apt update && apt upgrade -y
apt install -y curl git nginx ufw wget unzip software-properties-common

# Install Docker
log "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
else
    log "Docker already installed"
fi

# Install Docker Compose
log "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    log "Docker Compose already installed"
fi

# Setup firewall
log "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw --force enable

# Create application directory
log "Setting up application directory..."
mkdir -p /opt/panicswap
cd /opt/panicswap

# Download application
log "Downloading PanicSwap application..."
wget -qO- https://github.com/akalavre/PanicSwap-php/archive/refs/heads/main.tar.gz | tar xz --strip-components=1 || {
    warn "GitHub download failed, creating minimal structure..."
    mkdir -p api assets backend components config
}

# Create all necessary files inline
log "Creating configuration files..."

# Create docker-compose.production.yml
cat > docker-compose.production.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: panicswap-frontend
    ports:
      - "8080:80"
    volumes:
      - ./logs/apache:/var/log/apache2
    environment:
      - APP_ENV=production
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health.php"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - panicswap-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: panicswap-backend
    ports:
      - "3001:3001"
    volumes:
      - ./logs/backend:/app/logs
    environment:
      - NODE_ENV=production
    env_file:
      - ./backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - panicswap-network

  redis:
    image: redis:7-alpine
    container_name: panicswap-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - panicswap-network

networks:
  panicswap-network:
    driver: bridge

volumes:
  redis_data:
COMPOSE_EOF

# Create Dockerfile
cat > Dockerfile << 'DOCKERFILE_EOF'
FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    git \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd pdo pdo_mysql \
    && a2enmod rewrite headers

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

RUN if [ -f composer.json ]; then composer install --no-dev --optimize-autoloader; fi

COPY apache-config.conf /etc/apache2/sites-available/000-default.conf

EXPOSE 80

CMD ["apache2-foreground"]
DOCKERFILE_EOF

# Create backend Dockerfile
mkdir -p backend
cat > backend/Dockerfile << 'BACKEND_DOCKERFILE_EOF'
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production || npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
BACKEND_DOCKERFILE_EOF

# Create Apache config
cat > apache-config.conf << 'APACHE_EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
APACHE_EOF

# Create health check
cat > health.php << 'HEALTH_EOF'
<?php
http_response_code(200);
echo "OK";
HEALTH_EOF

# Create minimal index.php if missing
if [ ! -f index.php ]; then
    cat > index.php << 'INDEX_EOF'
<?php
echo "<h1>PanicSwap</h1>";
echo "<p>Deployment successful! Replace this with your actual application files.</p>";
echo "<p>Backend API: <a href='/api/health'>/api/health</a></p>";
INDEX_EOF
fi

# Create minimal backend package.json if missing
if [ ! -f backend/package.json ]; then
    cat > backend/package.json << 'PACKAGE_EOF'
{
  "name": "panicswap-backend",
  "version": "1.0.0",
  "description": "PanicSwap Backend",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
PACKAGE_EOF
fi

# Create minimal backend index.js if missing
if [ ! -f backend/index.js ]; then
    cat > backend/index.js << 'BACKEND_INDEX_EOF'
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
BACKEND_INDEX_EOF
fi

# Create production environment file
log "Creating environment configuration..."
cat > .env << 'ENV_EOF'
# Supabase Configuration
SUPABASE_URL=https://cfficjjdhgqwqprfhlrj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NjQwMTUsImV4cCI6MjA1MDE0MDAxNX0.yzotHIIuDQD5ItRvbJouHXBusO5YhC7reFRKc3U5aTI
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MzQ1NjQwMTUsImV4cCI6MjA1MDE0MDAxNX0.B3M1CHICcyAqZlHuypPxRP-CmgotcrzP8LAOLmxvtHE

# Helius Configuration
HELIUS_API_KEY=59c732de-1ad6-4c48-834f-aa6a90b06e8d
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=59c732de-1ad6-4c48-834f-aa6a90b06e8d

# Stripe Configuration (UPDATE THESE!)
STRIPE_SECRET_KEY=sk_test_REPLACE_ME
STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_ME
STRIPE_PUBLIC_KEY=pk_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME

# JWT Configuration
JWT_SECRET=fJ8aK2mN4pQ6sT8vX1yB3dG5hL7kM9nR

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
ENV_EOF

# Copy env to backend
cp .env backend/.env

# Configure Nginx
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/panicswap << 'NGINX_EOF'
server {
    listen 80;
    server_name 157.230.227.111;
    client_max_body_size 100M;

    # Frontend proxy
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # WebSocket proxy
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
NGINX_EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/panicswap /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Build and start containers
log "Building Docker containers (this may take a few minutes)..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true
docker-compose -f docker-compose.production.yml build

log "Starting PanicSwap services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services
log "Waiting for services to start..."
sleep 10

# Show status
log "Checking container status..."
docker-compose -f docker-compose.production.yml ps

# Create helper scripts
log "Creating helper scripts..."

cat > /usr/local/bin/panicswap << 'HELPER_EOF'
#!/bin/bash
cd /opt/panicswap
case "$1" in
  status)
    docker-compose -f docker-compose.production.yml ps
    ;;
  logs)
    docker-compose -f docker-compose.production.yml logs -f ${2}
    ;;
  restart)
    docker-compose -f docker-compose.production.yml restart ${2}
    ;;
  stop)
    docker-compose -f docker-compose.production.yml down
    ;;
  start)
    docker-compose -f docker-compose.production.yml up -d
    ;;
  update)
    git pull
    docker-compose -f docker-compose.production.yml build
    docker-compose -f docker-compose.production.yml up -d
    ;;
  *)
    echo "Usage: panicswap {status|logs|restart|stop|start|update} [service]"
    ;;
esac
HELPER_EOF
chmod +x /usr/local/bin/panicswap

# Final output
echo
echo "============================================="
echo -e "${GREEN}PanicSwap Deployment Complete!${NC}"
echo "============================================="
echo
echo "Access your application at: http://157.230.227.111"
echo
echo "Next steps:"
echo "1. Update Stripe keys: nano /opt/panicswap/.env"
echo "2. Restart after changes: panicswap restart"
echo
echo "Useful commands:"
echo "- View status: panicswap status"
echo "- View logs: panicswap logs"
echo "- View backend logs: panicswap logs backend"
echo "- Restart all: panicswap restart"
echo
warn "Remember to update your Stripe keys in /opt/panicswap/.env"
echo