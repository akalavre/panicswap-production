@echo off
echo.
echo =====================================
echo  PUMP.FUN DATA VERIFICATION TEST
echo =====================================
echo.
echo This test verifies what data is REAL vs SIMULATED
echo.

set /p token="Enter token contract address (or press Enter for default): "

if "%token%"=="" (
    set token=Ep53NDxoipoyFyh4dRc3fi1XqJPkE8Rw7Sbji6trpump
    echo Using default token: %token%
)

echo.
echo Testing token: %token%
echo.

node test-pump-fun-real-data.js %token%

echo.
echo =====================================
echo  WHAT'S REAL vs SIMULATED:
echo =====================================
echo.
echo ✅ REAL DATA WE FETCH:
echo    - Token holder accounts (on-chain)
echo    - Token balances per wallet (on-chain)
echo    - Total supply and decimals (on-chain)
echo    - Bonding curve account exists (on-chain)
echo.
echo ⚠️  PARTIALLY REAL:
echo    - Bonding curve reserves (needs correct decoding)
echo    - Dev wallet identification (based on creator field)
echo.
echo ❌ CURRENTLY SIMULATED:
echo    - Exact bonding curve values (wrong byte offsets)
echo    - Historical transaction monitoring
echo    - Social signals
echo.
pause