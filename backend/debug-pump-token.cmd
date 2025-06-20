@echo off
echo.
echo =====================================
echo  PUMP.FUN TOKEN DEEP ANALYSIS
echo =====================================
echo.
echo This will do a thorough check to see why the token isn't being detected
echo.

node test-pump-debug.js Ad2Xa9XHvxR4yiWyTpXJywAFr8KNAj8KFxHPmvf7pump

echo.
echo =====================================
echo If the bonding curve wasn't found, it could mean:
echo - Token graduated to Raydium (completed bonding curve)
echo - Bonding curve was rugged/closed
echo - RPC connection issues
echo =====================================
echo.
pause