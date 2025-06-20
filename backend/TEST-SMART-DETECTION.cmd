@echo off
cls
color 0E
title PanicSwap - Smart Detection Demo

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║           SMART RUG DETECTION DEMO                        ║
echo ╠═══════════════════════════════════════════════════════════╣
echo ║                                                           ║
echo ║  See how PanicSwap avoids false positives and            ║
echo ║  only triggers on REAL rug pulls!                        ║
echo ║                                                           ║
echo ║  Tests 5 different scenarios:                            ║
echo ║    • Normal pump (profit opportunity)                    ║
echo ║    • Natural correction                                  ║
echo ║    • Actual rug pull                                     ║
echo ║    • Slow rug                                            ║
echo ║    • Liquidity migration                                 ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
pause

cls
node test-smart-detection.js

echo.
pause