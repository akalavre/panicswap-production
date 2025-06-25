#!/bin/bash

# PanicSwap Digital Ocean Deployment Script
# Run this script on your Digital Ocean droplet

set -e

echo "🚀 Starting PanicSwap deployment on Digital Ocean..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Clone the repository
echo "📁 Cloning PanicSwap repository..."
if [ -d "panicswap-production" ]; then
    cd panicswap-production
    git pull origin main
else
    git clone https://github.com/akalavre/panicswap-production.git
    cd panicswap-production
fi

# Create environment file from example
echo "⚙️  Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "❗ Please edit .env file with your actual values before continuing"
    echo "❗ Required variables: SUPABASE_URL, SUPABASE_ANON_KEY, HELIUS_API_KEY, etc."
    read -p "Press enter after editing .env file..."
fi

# Create necessary directories
echo "📂 Creating directories..."
sudo mkdir -p logs nginx/conf.d redis ssl
sudo chown -R $USER:$USER logs nginx redis ssl

# Create nginx configuration
echo "🌐 Setting up Nginx configuration..."
cat > nginx/conf.d/panicswap.conf << 'EOF'
upstream frontend {
    server frontend:80;
}

upstream backend {
    server backend:3001;
}

server {
    listen 80;
    server_name _;
    
    # Frontend routes
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Create Redis configuration
echo "📄 Setting up Redis configuration..."
cat > redis/redis.conf << 'EOF'
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 60
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
EOF

# Build and start containers
echo "🔨 Building Docker containers..."
docker-compose -f docker-compose.production.yml build

echo "🚀 Starting services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.production.yml ps

# Test endpoints
echo "🧪 Testing endpoints..."
echo "Frontend: http://localhost"
echo "Backend API: http://localhost/api"

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "✅ Deployment complete!"
echo "📋 Next steps:"
echo "1. Point your domain to this server's IP address"
echo "2. Set up SSL certificate: sudo certbot --nginx -d yourdomain.com"
echo "3. Monitor logs: docker-compose -f docker-compose.production.yml logs -f"
echo "4. Access your application at: http://$(curl -s ifconfig.me)"
