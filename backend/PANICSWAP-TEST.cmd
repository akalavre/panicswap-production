@echo off
cls
color 0B
title PanicSwap - Test Any Token

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║            PANICSWAP TOKEN TESTING SUITE                  ║
echo ╠═══════════════════════════════════════════════════════════╣
echo ║                                                           ║
echo ║  Test any Solana token with PanicSwap protection!        ║
echo ║                                                           ║
echo ║  Supports:                                                ║
echo ║    • Pump.fun tokens (bonding curve analysis)            ║
echo ║    • Raydium tokens (liquidity pool monitoring)          ║
echo ║    • Any SPL token (holder analysis)                     ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

set /p token="Enter token contract address: "

if "%token%"=="" (
    echo.
    echo ❌ No token entered. Exiting...
    pause
    exit
)

echo.
echo You entered: %token%
echo.
echo Select test type:
echo.
echo 1. Full Interactive Demo (recommended)
echo 2. Live Monitoring Visualization
echo 3. Technical Analysis Only
echo 4. Quick Risk Check
echo.

set /p choice="Enter your choice (1-4): "

echo.

if "%choice%"=="1" (
    echo Starting Full Interactive Demo...
    echo.
    node demo-complete-flow.js
) else if "%choice%"=="2" (
    echo Starting Live Monitoring Demo...
    echo.
    node demo-live-monitor.js %token%
) else if "%choice%"=="3" (
    echo Running Technical Analysis...
    echo.
    node test-pump-fun-protection.js %token%
) else if "%choice%"=="4" (
    echo Running Quick Risk Check...
    echo.
    node test-pump-simple.js %token%
) else (
    echo Invalid choice.
)

echo.
echo ═══════════════════════════════════════════════════════════
echo.
pause