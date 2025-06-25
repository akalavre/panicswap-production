@echo off
setlocal enabledelayedexpansion

echo.
echo === Supabase Backup Tool for PanicSwap ===
echo.
echo Project: cfficjjdhgqwqprfhlrj
echo Region: eu-west-2
echo.
echo IMPORTANT: You need your database password from Supabase Dashboard
echo (Settings - Database - Connection string)
echo.

:: Create backups directory
if not exist "backups" mkdir backups

:: Get timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ("%TIME%") do (set mytime=%%a%%b)
set mytime=%mytime: =0%
set TIMESTAMP=%mydate%_%mytime%

:: Database details
set PROJECT_REF=cfficjjdhgqwqprfhlrj
set DB_HOST=aws-0-eu-west-2.pooler.supabase.com
set DB_PORT=5432
set DB_NAME=postgres
set DB_USER=postgres.%PROJECT_REF%

:: Prompt for password
set /p DB_PASSWORD="Enter database password: "

:: Build connection string
set DB_URL=postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%

echo.
echo Choose backup type:
echo 1) Full backup (schema + data)
echo 2) Schema only
echo 3) Data only
echo 4) Critical tables only
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Creating full backup...
    set FILENAME=backups\panicswap_full_%TIMESTAMP%.sql
    pg_dump "%DB_URL%" > "!FILENAME!" 2>nul
) else if "%choice%"=="2" (
    echo.
    echo Creating schema backup...
    set FILENAME=backups\panicswap_schema_%TIMESTAMP%.sql
    pg_dump --schema-only "%DB_URL%" > "!FILENAME!" 2>nul
) else if "%choice%"=="3" (
    echo.
    echo Creating data backup...
    set FILENAME=backups\panicswap_data_%TIMESTAMP%.sql
    pg_dump --data-only "%DB_URL%" > "!FILENAME!" 2>nul
) else if "%choice%"=="4" (
    echo.
    echo Creating critical tables backup...
    set FILENAME=backups\panicswap_critical_%TIMESTAMP%.sql
    set TABLES=-t public.wallet_tokens -t public.protected_tokens -t public.rugcheck_reports
    set TABLES=!TABLES! -t public.liquidity_velocity -t public.rug_patterns -t public.ml_predictions
    set TABLES=!TABLES! -t public.social_metrics -t public.users -t public.subscriptions
    pg_dump !TABLES! "%DB_URL%" > "!FILENAME!" 2>nul
) else (
    echo Invalid choice
    pause
    exit /b 1
)

:: Check if backup was successful
if exist "!FILENAME!" (
    echo.
    echo ==============================
    echo Backup completed successfully!
    echo File: !FILENAME!
    echo ==============================
    echo.
    echo To restore this backup later:
    echo psql "%DB_URL%" ^< !FILENAME!
    echo.
) else (
    echo.
    echo ERROR: Backup failed!
    echo Please check your password and ensure pg_dump is installed.
    echo.
)

pause