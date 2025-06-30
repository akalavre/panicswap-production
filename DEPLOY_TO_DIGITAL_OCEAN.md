# PanicSwap Digital Ocean Deployment Guide

## Prerequisites

1. Digital Ocean Droplet (Ubuntu 22.04 LTS recommended)
2. Docker and Docker Compose installed on the droplet
3. Domain name pointed to your droplet's IP address
4. SSL certificate (Let's Encrypt recommended)

## Step 1: Server Setup

### Connect to your Digital Ocean droplet:
```bash
ssh root@your-droplet-ip
```

### Install Docker and Docker Compose:
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start Docker service
systemctl start docker
systemctl enable docker
```

## Step 2: Clone and Deploy

### Clone the repository:
```bash
git clone https://github.com/akalavre/panicswap-production.git
cd panicswap-production
```

### Create environment file:
```bash
cp .env.example .env
nano .env  # Edit with your actual values
```

### Required Environment Variables:
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
HELIUS_API_KEY=your-helius-key
HELIUS_RPC_URL=your-helius-rpc-url
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable
JWT_SECRET=your-jwt-secret
APP_URL=https://yourdomain.com
```

## Step 3: Build and Deploy

### Build the containers:
```bash
docker compose -f docker-compose.production.yml build
```

### Start the services:
```bash
docker compose -f docker-compose.production.yml up -d
```

### Check status:
```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs
```

## Step 4: SSL Setup (Optional - using Nginx)

### Install Certbot:
```bash
apt install certbot python3-certbot-nginx -y
```

### Get SSL certificate:
```bash
certbot --nginx -d yourdomain.com
```

## Step 5: Monitoring and Maintenance

### View logs:
```bash
docker compose -f docker-compose.production.yml logs -f
```

### Restart services:
```bash
docker compose -f docker-compose.production.yml restart
```

### Update deployment:
```bash
git pull
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

### Backup database:
```bash
docker exec panicswap-backend npm run backup
```

## Troubleshooting

### Check container status:
```bash
docker ps -a
```

### Enter container for debugging:
```bash
docker exec -it panicswap-frontend bash
docker exec -it panicswap-backend bash
```

### Check resource usage:
```bash
docker stats
```

### Cleanup unused images:
```bash
docker system prune -a
```

## Security Considerations

1. Use strong passwords for all services
2. Enable UFW firewall:
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```
3. Regular security updates
4. Monitor logs for suspicious activity
5. Use environment variables for sensitive data
