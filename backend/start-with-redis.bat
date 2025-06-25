@echo off
echo Starting PanicSwap Backend with Redis...
echo ========================================

:: Check if Redis is already running
netstat -an | findstr :6379 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo Redis is already running on port 6379
    set REDIS_ENABLED=true
) else (
    echo Redis not detected on port 6379, checking for local installation...
    
    :: Try to find redis-server.exe in common locations
    if exist "C:\Redis\redis-server.exe" (
        echo Starting Redis from C:\Redis...
        start /B "Redis" "C:\Redis\redis-server.exe"
        timeout /t 2 /nobreak >nul
        set REDIS_ENABLED=true
    ) else if exist "C:\Program Files\Redis\redis-server.exe" (
        echo Starting Redis from Program Files...
        start /B "Redis" "C:\Program Files\Redis\redis-server.exe"
        timeout /t 2 /nobreak >nul
        set REDIS_ENABLED=true
    ) else if exist "%USERPROFILE%\Redis\redis-server.exe" (
        echo Starting Redis from user directory...
        start /B "Redis" "%USERPROFILE%\Redis\redis-server.exe"
        timeout /t 2 /nobreak >nul
        set REDIS_ENABLED=true
    ) else if exist "C:\tools\redis\redis-server.exe" (
        echo Starting Redis from C:\tools...
        start /B "Redis" "C:\tools\redis\redis-server.exe"
        timeout /t 2 /nobreak >nul
        set REDIS_ENABLED=true
    ) else (
        echo.
        echo Redis not found! The backend will use in-memory cache only.
        echo.
        echo To install Redis for Windows:
        echo   1. Download from: https://github.com/microsoftarchive/redis/releases
        echo   2. Extract to C:\Redis
        echo   3. Run this script again
        echo.
        echo Or just use start-simple.bat to run without Redis.
        echo.
        set REDIS_ENABLED=false
    )
)

echo.
echo Starting PanicSwap Backend...
echo ========================================

:: Try compiled version first
if exist "dist\index.js" (
    echo Running compiled version...
    node dist\index.js
) else (
    echo Compiled version not found, using ts-node...
    npx ts-node src\index.ts
)

pause