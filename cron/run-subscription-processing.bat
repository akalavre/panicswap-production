@echo off
REM Windows Task Scheduler script for PanicSwap subscription processing
REM Schedule this to run daily at midnight

REM Change this path to match your WAMP PHP installation
set PHP_PATH=C:\wamp64\bin\php\php8.2.0\php.exe

REM Change this path to match your PanicSwap installation
set SCRIPT_PATH=C:\wamp64\www\PanicSwap-php\cron\process-subscriptions.php

REM Run the subscription processing
"%PHP_PATH%" "%SCRIPT_PATH%"

REM Optional: Keep window open to see results (remove for production)
REM pause