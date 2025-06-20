@echo off
echo.
echo =====================================
echo  PUMP.FUN TOKEN DEEP INVESTIGATION
echo =====================================
echo.

echo Installing required dependency...
npm install @metaplex-foundation/js --no-save

echo.
echo Checking token metadata and transaction history...
echo.

node test-pump-metadata.js Ad2Xa9XHvxR4yiWyTpXJywAFr8KNAj8KFxHPmvf7pump

echo.
pause