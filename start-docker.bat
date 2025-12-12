@echo off
REM GitHub PR Dashboard - Docker Startup Script for Windows
REM This script helps you quickly get the application up and running

echo GitHub PR Dashboard - Docker Setup
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed.
    echo Please install Docker from: https://docs.docker.com/get-docker/
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker Compose is not installed.
    echo Please install Docker Compose from: https://docs.docker.com/compose/install/
    exit /b 1
)

echo [OK] Docker and Docker Compose are installed
echo.

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found
    
    if exist env.example (
        echo Copying env.example to .env...
        copy env.example .env >nul
        echo [OK] Created .env file
        echo.
        echo Please edit .env file with your GitHub token and repositories
        echo.
        echo Required configuration:
        echo   - GITHUB_TOKEN: Your GitHub personal access token
        echo   - REPOSITORIES: Comma-separated list of repos ^(owner/repo^)
        echo.
        echo After editing .env, run this script again.
        pause
        exit /b 0
    ) else (
        echo Error: env.example not found
        exit /b 1
    )
)

REM Check if .env has required variables
findstr /R "GITHUB_TOKEN=..*" .env >nul
if errorlevel 1 (
    echo Error: GITHUB_TOKEN is not set in .env
    echo Please edit .env and add your GitHub personal access token
    pause
    exit /b 1
)

findstr /R "REPOSITORIES=..*" .env >nul
if errorlevel 1 (
    echo Error: REPOSITORIES is not set in .env
    echo Please edit .env and add your repositories ^(owner/repo format^)
    pause
    exit /b 1
)

echo [OK] Configuration file ^(.env^) is present
echo.

REM Ask user if they want to rebuild
echo Build Options:
echo 1. Start with existing images ^(fast^)
echo 2. Rebuild images ^(recommended for first run or after updates^)
echo.
set /p BUILD_OPTION="Select option (1 or 2): "

if "%BUILD_OPTION%"=="2" (
    echo.
    echo Building Docker images...
    docker-compose build --no-cache
    echo [OK] Images built successfully
    echo.
)

REM Start containers
echo Starting containers...
docker-compose up -d

REM Wait for services to be healthy
echo.
echo Waiting for services to be ready...
timeout /t 5 /nobreak >nul

REM Display status
echo.
echo Container Status:
docker-compose ps
echo.

REM Get port from .env or use default
set CLIENT_PORT=3000
for /f "tokens=2 delims==" %%a in ('findstr "^CLIENT_PORT=" .env 2^>nul') do set CLIENT_PORT=%%a

echo [OK] GitHub PR Dashboard is running!
echo.
echo Access the dashboard at: http://localhost:%CLIENT_PORT%
echo.
echo Useful Commands:
echo   View logs:       docker-compose logs -f
echo   Stop services:   docker-compose down
echo   Restart:         docker-compose restart
echo   Check health:    docker-compose ps
echo.

pause

