@echo off
cls
color 0E
title PanicSwap - Graduation Dashboard

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║            🎓 LIVE GRADUATION DASHBOARD 🎓                ║
echo ╠═══════════════════════════════════════════════════════════╣
echo ║                                                           ║
echo ║  Monitor multiple pump.fun tokens approaching graduation! ║
echo ║                                                           ║
echo ║  Features:                                                ║
echo ║    • Real-time progress tracking                         ║
echo ║    • Market cap calculations                             ║
echo ║    • Time estimates to $69k                              ║
echo ║    • Auto-refresh every 30 seconds                       ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo Enter token addresses you want to monitor.
echo Press Enter on empty line when done.
echo.

node graduation-dashboard.js

pause