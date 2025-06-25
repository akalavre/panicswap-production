@echo off
echo Starting PanicSwap Backend (Simple Mode - No Redis)...
echo ========================================
echo.
echo This will start the backend without Redis.
echo The system will use in-memory caching.
echo.
echo To start with Redis, use: start-with-redis.bat
echo.

:: Try compiled version first
if exist "dist\index.js" (
    echo Running compiled version...
    node dist\index.js
) else (
    echo Compiled version not found, using ts-node...
    npx ts-node src\index.ts
)

pause