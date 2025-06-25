#!/bin/bash

echo "Redis Installation Script for Ubuntu/WSL"
echo "======================================="
echo ""
echo "This script will install Redis on your system."
echo "You'll need to enter your sudo password when prompted."
echo ""

# Update package list
echo "1. Updating package list..."
sudo apt update

# Install Redis
echo ""
echo "2. Installing Redis server..."
sudo apt install -y redis-server

# Enable Redis to start on boot
echo ""
echo "3. Enabling Redis service..."
sudo systemctl enable redis-server

# Start Redis
echo ""
echo "4. Starting Redis..."
sudo systemctl start redis-server

# Check Redis status
echo ""
echo "5. Checking Redis status..."
sudo systemctl status redis-server --no-pager

# Test Redis connection
echo ""
echo "6. Testing Redis connection..."
redis-cli ping

echo ""
echo "✅ Redis installation complete!"
echo ""
echo "Redis is now running on port 6379."
echo "You can test it with: redis-cli ping"
echo "Expected response: PONG"