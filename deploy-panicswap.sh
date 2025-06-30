#!/bin/bash
# PanicSwap Complete Deployment Script
set -e

DROPLET_IP="157.230.227.111"
APP_DIR="/opt/panicswap"

echo "=== PanicSwap Deployment Script ==="
echo "Deploying to: $DROPLET_IP"
echo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing required packages..."
apt install -y curl git nginx certbot python3-certbot-nginx ufw unzip

# Install Docker
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    print_status "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    print_status "Docker Compose already installed"
fi

# Start Docker service
systemctl start docker
systemctl enable docker

# Setup firewall
print_status "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw --force enable

# Create app directory
print_status "Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Download application from GitHub
print_status "Downloading PanicSwap application..."
if [ -d ".git" ]; then
    print_status "Updating existing repository..."
    git pull
else
    print_status "Cloning repository..."
    git clone https://github.com/akalavre/panicswap-production.git .
fi

# Create environment file
if [ ! -f .env ]; then
    print_status "Creating environment file..."
    cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://cfficjjdhgqwqprfhlrj.supabase.co
SUPABASE_ANON_KEY=REPLACE_ME
SUPABASE_SERVICE_KEY=REPLACE_ME

# Helius Configuration
HELIUS_API_KEY=REPLACE_ME
HELIUS_RPC_URL=REPLACE_ME

# Stripe Configuration  
STRIPE_SECRET_KEY=REPLACE_ME
STRIPE_PUBLISHABLE_KEY=REPLACE_ME
STRIPE_PUBLIC_KEY=REPLACE_ME
STRIPE_WEBHOOK_SECRET=REPLACE_ME

# JWT Configuration
JWT_SECRET=REPLACE_ME_WITH_RANDOM_STRING

# App Configuration
APP_URL=http://157.230.227.111
NODE_ENV=production
PORT=3001

# Redis Configuration (Upstash)
REDIS_ENABLED=true
UPSTASH_REDIS_REST_URL=REPLACE_ME
UPSTASH_REDIS_REST_TOKEN=REPLACE_ME

# Telegram Configuration
TELEGRAM_BOT_TOKEN=REPLACE_ME

# RapidAPI (for PumpFun)
RAPIDAPI_KEY=569a7556f4msh8d57a65d8b82bd4p172d03jsnd997df914e22

# Alchemy Fallback RPC
ALCHEMY_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/REPLACE_ME

# ML Service Configuration
ML_ENABLED=true
ML_UPDATE_INTERVAL_MS=45000
EOF
    chmod 600 .env
    print_warning "Environment file created. Please edit $APP_DIR/.env with your actual values!"
fi

# Create backend .env
mkdir -p backend
cp .env backend/.env

# Configure Nginx
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/panicswap << 'EOF'
server {
    listen 80;
    server_name 157.230.227.111;

    # Frontend proxy
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/panicswap /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/panicswap.service << 'EOF'
[Unit]
Description=PanicSwap Docker Compose Application
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/panicswap
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
ExecReload=/usr/local/bin/docker-compose -f docker-compose.production.yml restart
TimeoutStartSec=0
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable panicswap

# Create monitoring script
print_status "Creating monitoring script..."
cat > /usr/local/bin/panicswap-status << 'EOF'
#!/bin/bash
echo "=== PanicSwap Status ==="
echo
echo "Docker Containers:"
docker-compose -f /opt/panicswap/docker-compose.production.yml ps
echo
echo "Recent Logs:"
docker-compose -f /opt/panicswap/docker-compose.production.yml logs --tail=20
echo
echo "System Resources:"
docker stats --no-stream
EOF
chmod +x /usr/local/bin/panicswap-status

print_status "Setup complete!"
echo
echo "=== Next Steps ==="
echo "1. Edit environment variables:"
echo "   nano $APP_DIR/.env"
echo
echo "2. Build and start the application:"
echo "   cd $APP_DIR"
echo "   docker-compose -f docker-compose.production.yml build"
echo "   systemctl start panicswap"
echo
echo "3. Check application status:"
echo "   panicswap-status"
echo
echo "4. View logs:"
echo "   docker-compose -f docker-compose.production.yml logs -f"
echo
echo "5. Access the application:"
echo "   http://$DROPLET_IP"
echo
print_warning "Remember to configure your environment variables before starting!"