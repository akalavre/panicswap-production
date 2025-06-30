#!/bin/bash
# Upload and deploy PanicSwap to DigitalOcean droplet

DROPLET_IP="157.230.227.111"

echo "=== Uploading deployment script to droplet ==="
echo "You will be prompted for the root password of your droplet"
echo

# Make the deployment script executable locally
chmod +x deploy-panicswap.sh

# Upload the deployment script
scp deploy-panicswap.sh root@$DROPLET_IP:/tmp/

# Upload the docker-compose.production.yml file
scp docker-compose.production.yml root@$DROPLET_IP:/tmp/

# Upload necessary files
echo "Creating deployment archive..."
tar -czf panicswap-files.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=vendor \
    --exclude=backend/node_modules \
    --exclude=*.log \
    --exclude=.env \
    --exclude=.env.local \
    .

echo "Uploading application files..."
scp panicswap-files.tar.gz root@$DROPLET_IP:/tmp/

# Execute the deployment script
echo "Executing deployment on droplet..."
ssh root@$DROPLET_IP << 'EOF'
cd /tmp
chmod +x deploy-panicswap.sh
./deploy-panicswap.sh

# Extract application files
mkdir -p /opt/panicswap
cd /opt/panicswap
tar -xzf /tmp/panicswap-files.tar.gz
cp /tmp/docker-compose.production.yml .

# Cleanup
rm -f /tmp/deploy-panicswap.sh /tmp/panicswap-files.tar.gz /tmp/docker-compose.production.yml

echo
echo "=== Deployment script completed ==="
echo "Please configure your environment variables and start the application"
EOF

# Cleanup local files
rm -f panicswap-files.tar.gz

echo
echo "=== Local deployment script completed ==="
echo
echo "Next steps:"
echo "1. SSH into your droplet: ssh root@$DROPLET_IP"
echo "2. Configure environment variables: nano /opt/panicswap/.env"
echo "3. Build Docker images: cd /opt/panicswap && docker-compose -f docker-compose.production.yml build"
echo "4. Start the application: systemctl start panicswap"
echo "5. Check status: panicswap-status"