@echo off
echo.
echo ===================================
echo  PANICSWAP PROTECTION SYSTEM TEST
echo ===================================
echo.

echo Which test would you like to run?
echo.
echo 1. Pump.fun Rug Detection (NEW!)
echo 2. Traditional Token Protection
echo 3. Exit
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    set /p pumptoken="Enter pump.fun token address (or press Enter for default): "
    echo.
    echo Running Pump.fun rug detection test...
    echo.
    if "%pumptoken%"=="" (
        node test-pump-fun-protection.js
    ) else (
        node test-pump-fun-protection.js %pumptoken%
    )
) else if "%choice%"=="2" (
    echo.
    echo Running traditional token protection test...
    echo.
    node test-demo-protection-flow.js
) else if "%choice%"=="3" (
    exit
) else (
    echo Invalid choice. Please run again.
)

echo.
echo ===================================
echo  TEST COMPLETE
echo ===================================
echo.
echo Popular pump.fun tokens to test:
echo - Trump Mobile: Ep53NDxoipoyFyh4dRc3fi1XqJPkE8Rw7Sbji6trpump
echo - Any new pump.fun token from pump.fun website
echo.
echo Established tokens (Raydium):
echo - BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
echo - WIF: EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm
echo.
pause