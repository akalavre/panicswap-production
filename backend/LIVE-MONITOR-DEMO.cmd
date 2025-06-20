@echo off
cls
color 0E
title PanicSwap - Live Monitoring Demo

echo.
echo =====================================================
echo       PANICSWAP LIVE MONITORING DEMO
echo =====================================================
echo.
echo This demo simulates real-time monitoring and
echo automatic protection execution.
echo.
echo Watch as PanicSwap:
echo   - Monitors token metrics in real-time
echo   - Detects a rug pull attempt
echo   - Executes emergency protection
echo   - Saves your funds automatically
echo.
pause

cls
node demo-live-monitor.js %1

echo.
pause