@echo off
REM Simple batch file to start all services

REM Terminal 1: Backend
start cmd /k wsl -e bash -c "cd /mnt/c/Users/akala/Desktop/PanicSwap-nextjs/backend && npm run dev"

REM Wait 5 seconds
timeout /t 5

REM Terminal 2: Ngrok
start cmd /k wsl -e bash -c "ngrok http 3001"

REM Terminal 3: Instructions
start cmd /k wsl -e bash -c "cd /mnt/c/Users/akala/Desktop/PanicSwap-nextjs/backend && echo 'Wait for ngrok to show URL, then run:' && echo 'WEBHOOK_URL=https://YOUR-NGROK-URL.ngrok-free.app/api/webhook/helius npx ts-node register-webhooks.ts' && bash"

echo All terminals started!
pause