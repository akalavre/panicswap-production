# PowerShell script to start webhook setup
Write-Host "Starting PanicSwap Webhook Setup..." -ForegroundColor Green
Write-Host ""

# Change to backend directory
$backendPath = "/mnt/c/Users/akala/Desktop/PanicSwap-nextjs/backend"

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Yellow
Start-Process wt -ArgumentList "new-tab --title Backend wsl bash -c `"cd $backendPath && npm run dev`""

# Wait for backend to start
Start-Sleep -Seconds 5

# Start ngrok
Write-Host "Starting Ngrok..." -ForegroundColor Yellow
Start-Process wt -ArgumentList "new-tab --title Ngrok wsl bash -c `"ngrok http 3001`""

# Wait for ngrok to start
Start-Sleep -Seconds 5

# Try to get ngrok URL automatically
Write-Host "Attempting to get ngrok URL..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Open webhook registration terminal
$registrationScript = @"
cd $backendPath
echo 'Checking for ngrok URL...'
echo ''
# Try to get ngrok URL from API
NGROK_URL=\$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
if [ -n "\$NGROK_URL" ]; then
    echo "Found ngrok URL: \$NGROK_URL"
    echo ""
    echo "Registering webhook..."
    WEBHOOK_URL=\$NGROK_URL/api/webhook/helius npx ts-node register-webhooks.ts
else
    echo "Could not auto-detect ngrok URL."
    echo "Please copy the HTTPS URL from the ngrok window and run:"
    echo ""
    echo "WEBHOOK_URL=https://YOUR-NGROK-URL.ngrok-free.app/api/webhook/helius npx ts-node register-webhooks.ts"
fi
bash
"@

Start-Process wt -ArgumentList "new-tab --title 'Webhook Registration' wsl bash -c `"$registrationScript`""

Write-Host ""
Write-Host "All terminals opened!" -ForegroundColor Green
Write-Host "The webhook registration will attempt to auto-detect the ngrok URL." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")