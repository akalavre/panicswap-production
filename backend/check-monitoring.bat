@echo off
echo.
echo ========================================
echo  Checking Monitoring Data
echo ========================================
echo.

cd /d "%~dp0"

echo Running monitoring data check...
node check-monitoring-data.js

echo.
pause