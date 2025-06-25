@echo off
echo.
echo ==========================================
echo  Restarting Backend and Fixing Monitoring
echo ==========================================
echo.

echo Step 1: Please make sure the backend is stopped
echo        Press Ctrl+C in the backend terminal if it's running
echo.
pause

echo.
echo Step 2: Starting backend with latest code...
echo.
start cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Waiting 10 seconds for backend to start...
timeout /t 10 /nobreak >nul

echo.
echo Step 3: Running monitoring fix...
echo.
cd /d "%~dp0"
node fix-monitoring-data.js

echo.
echo ==========================================
echo  Fix Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Wait 30-60 seconds for velocity calculations
echo 2. Open test page in your browser:
echo    http://localhost/PanicSwap-php/test-monitoring-api.html
echo 3. Click "Test Monitoring Status API"
echo.
echo If you still see zeros:
echo - Wait another minute
echo - Run check-monitoring.bat to verify data
echo.
pause