# DigitalOcean Droplet Deployment Checklist

## Pre-Deployment Requirements

- [ ] DigitalOcean Droplet (Ubuntu 22.04 LTS, minimum 2GB RAM)
- [ ] Domain name pointed to droplet IP
- [ ] SSH access to droplet
- [ ] All API keys ready (Supabase, Helius, Stripe, etc.)

## Deployment Steps

### 1. Prepare Environment Variables
Edit `.env.production` with your actual values:
```bash
# Required environment variables
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
HELIUS_API_KEY=your-helius-key
HELIUS_RPC_URL=your-helius-rpc-url
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable
STRIPE_WEBHOOK_SECRET=your-webhook-secret
JWT_SECRET=generate-a-secure-random-string
APP_URL=https://yourdomain.com
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
RAPIDAPI_KEY=your-rapidapi-key
```

### 2. Run Automated Deployment
```bash
./deploy-to-droplet.sh YOUR_DROPLET_IP
```

### 3. Complete Setup on Droplet
SSH into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Then complete the setup:
```bash
# Navigate to app directory
cd /opt/panicswap

# Edit environment variables
nano .env

# Build Docker containers
docker-compose -f docker-compose.production.yml build

# Start services
systemctl start panicswap
# OR manually:
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
```

### 4. SSL Certificate Setup
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d yourdomain.com
```

### 5. Configure Nginx (if using)
Create `/etc/nginx/sites-available/panicswap`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
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

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/panicswap /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 6. Post-Deployment Verification

- [ ] Frontend loads at https://yourdomain.com
- [ ] Backend API responds at https://yourdomain.com/api/health
- [ ] WebSocket connection works
- [ ] Database connection verified
- [ ] Redis/Upstash connection verified
- [ ] Stripe webhooks configured
- [ ] Telegram bot connected

### 7. Monitoring Setup

Check logs:
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
```

Monitor resources:
```bash
docker stats
htop
```

### 8. Backup Strategy

Create backup script:
```bash
#!/bin/bash
# /opt/panicswap/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker exec panicswap-backend npm run backup
# Copy to backup location
```

## Troubleshooting

### Container won't start
```bash
docker-compose -f docker-compose.production.yml logs [service-name]
docker ps -a
```

### Database connection issues
- Verify Supabase URL and keys in .env
- Check firewall isn't blocking outbound connections

### Frontend not accessible
- Check nginx configuration
- Verify port 80/443 are open in firewall
- Check Docker container is running

### Backend API errors
- Check backend logs for specific errors
- Verify all environment variables are set
- Ensure Redis/Upstash is accessible

## Maintenance Commands

Update deployment:
```bash
cd /opt/panicswap
git pull
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

Restart services:
```bash
systemctl restart panicswap
# OR
docker-compose -f docker-compose.production.yml restart
```

Clean up Docker:
```bash
docker system prune -a
```