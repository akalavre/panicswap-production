@echo off
echo ================================================
echo    PanicSwap Backend - Initial Setup
echo ================================================
echo.

:: Check Node.js installation
echo Checking prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js (v16 or higher) from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

:: Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

:: Install global tools
echo Installing development tools...
call npm install -g nodemon
call npm install -g pm2
echo.

:: Create necessary directories
echo Creating directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "temp" mkdir temp
echo.

:: Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    if exist ".env.example" (
        copy .env.example .env
        echo .env file created from template.
    ) else (
        :: Create a basic .env file
        (
            echo # PanicSwap Backend Configuration
            echo NODE_ENV=development
            echo PORT=3001
            echo.
            echo # Supabase Configuration
            echo SUPABASE_URL=https://cfficjjdhgqwqprfhlrj.supabase.co
            echo SUPABASE_ANON_KEY=your_anon_key_here
            echo SUPABASE_SERVICE_KEY=your_service_key_here
            echo.
            echo # Helius API Configuration
            echo HELIUS_API_KEY=your_helius_api_key_here
            echo.
            echo # Moralis API Configuration  
            echo MORALIS_API_KEY=your_moralis_api_key_here
            echo.
            echo # Solana Configuration
            echo SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
            echo SOLANA_CLUSTER=mainnet-beta
            echo.
            echo # WebSocket Configuration
            echo WS_PORT=3002
            echo.
            echo # Redis Configuration (optional)
            echo REDIS_URL=redis://localhost:6379
            echo.
            echo # Database Configuration
            echo DATABASE_URL=your_database_url_here
        ) > .env
        
        echo .env file created with template values.
    )
    echo.
    echo IMPORTANT: Please edit the .env file with your actual API keys!
    echo.
)

:: Check if TypeScript is being used
if exist "tsconfig.json" (
    echo Building TypeScript files...
    call npm run build 2>nul
    if %errorlevel% neq 0 (
        echo No build script found or build failed.
    )
    echo.
)

:: Display next steps
echo ================================================
echo    Setup Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Edit the .env file with your API keys
echo 2. Run 'start.bat' to start the development server
echo 3. Run 'start-all.bat' to start all services
echo.
echo Available scripts:
echo - start.bat       : Start development server
echo - start-dev.bat   : Start with hot reload
echo - start-all.bat   : Start all microservices
echo - stop-all.bat    : Stop all services
echo.
echo For production deployment:
echo - Use PM2: pm2 start ecosystem.config.js
echo - Or use: npm run start
echo.

pause