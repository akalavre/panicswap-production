#!/bin/bash

# PanicSwap Droplet Deployment Script
# This script automates the deployment to a DigitalOcean droplet

set -e

echo "=== PanicSwap Droplet Deployment ==="
echo

# Check if droplet IP is provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy-to-droplet.sh <DROPLET_IP>"
    echo "Example: ./deploy-to-droplet.sh 123.45.67.89"
    exit 1
fi

DROPLET_IP=$1
DEPLOY_USER=${2:-root}

echo "Deploying to: $DEPLOY_USER@$DROPLET_IP"
echo

# Create deployment package
echo "Creating deployment package..."
tar -czf panicswap-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=vendor \
    --exclude=.env \
    --exclude=*.log \
    --exclude=deploy-to-droplet.sh \
    --exclude=panicswap-deploy.tar.gz \
    .

# Copy files to droplet
echo "Copying files to droplet..."
scp panicswap-deploy.tar.gz $DEPLOY_USER@$DROPLET_IP:/tmp/

# Create setup script
cat > setup-droplet.sh << 'EOF'
#!/bin/bash
set -e

echo "=== Setting up PanicSwap on Droplet ==="

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Start Docker service
systemctl start docker
systemctl enable docker

# Create app directory
mkdir -p /opt/panicswap
cd /opt/panicswap

# Extract deployment package
echo "Extracting application files..."
tar -xzf /tmp/panicswap-deploy.tar.gz
rm /tmp/panicswap-deploy.tar.gz

# Create environment file from production template
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        cp .env.production .env
    elif [ -f .env.example ]; then
        cp .env.example .env
    fi
    echo "IMPORTANT: Edit /opt/panicswap/.env with your production values!"
fi

# Set proper permissions
chmod 600 .env

# Setup firewall
echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw --force enable

# Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/panicswap.service << 'SERVICEEOF'
[Unit]
Description=PanicSwap Docker Compose Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/panicswap
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable panicswap

echo
echo "=== Setup Complete ==="
echo
echo "Next steps:"
echo "1. Edit environment variables: nano /opt/panicswap/.env"
echo "2. Build containers: cd /opt/panicswap && docker-compose -f docker-compose.production.yml build"
echo "3. Start services: systemctl start panicswap"
echo "4. Check status: docker-compose -f docker-compose.production.yml ps"
echo "5. View logs: docker-compose -f docker-compose.production.yml logs -f"
echo
echo "For SSL setup, run: apt install certbot python3-certbot-nginx -y && certbot --nginx -d yourdomain.com"
EOF

# Copy and run setup script
echo "Running setup on droplet..."
scp setup-droplet.sh $DEPLOY_USER@$DROPLET_IP:/tmp/
ssh $DEPLOY_USER@$DROPLET_IP "bash /tmp/setup-droplet.sh"

# Cleanup
rm setup-droplet.sh
rm panicswap-deploy.tar.gz

echo
echo "=== Deployment Complete ==="
echo
echo "SSH into your droplet to complete setup:"
echo "ssh $DEPLOY_USER@$DROPLET_IP"
echo
echo "Required environment variables in /opt/panicswap/.env:"
echo "- SUPABASE_URL"
echo "- SUPABASE_ANON_KEY" 
echo "- SUPABASE_SERVICE_KEY"
echo "- HELIUS_API_KEY"
echo "- HELIUS_RPC_URL"
echo "- STRIPE_SECRET_KEY"
echo "- STRIPE_PUBLISHABLE_KEY"
echo "- JWT_SECRET"
echo "- APP_URL"
echo "- UPSTASH_REDIS_REST_URL"
echo "- UPSTASH_REDIS_REST_TOKEN"