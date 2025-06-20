@echo off
cls
color 0D
title PanicSwap - Graduation Monitor

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║              🎓 PUMP.FUN GRADUATION MONITOR 🎓            ║
echo ╠═══════════════════════════════════════════════════════════╣
echo ║                                                           ║
echo ║  Track tokens approaching graduation to Raydium!          ║
echo ║                                                           ║
echo ║  Graduation happens at $69,000 market cap when:          ║
echo ║    • Bonding curve completes                             ║
echo ║    • Liquidity migrates to Raydium                       ║
echo ║    • Often leads to price surge!                         ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

node test-graduation-monitor.js

echo.
pause