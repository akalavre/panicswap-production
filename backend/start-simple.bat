@echo off
echo Starting PanicSwap Backend (Simple Mode)...
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