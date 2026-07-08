REM Quick verification script for Meeting Backend setup (Windows)
@echo off
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Meeting Backend - Setup Verification (Windows)        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo ✓ Node.js: !NODE_VERSION!
) else (
    echo ✗ Node.js not found
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
    echo ✓ npm: !NPM_VERSION!
) else (
    echo ✗ npm not found
    exit /b 1
)

echo.
echo Checking project files...

setlocal
REM Check key files
for %%f in (
    "package.json"
    "src\app.js"
    "src\server.js"
    "src\config\mongodb.js"
    "src\config\redis.js"
    "src\models\User.js"
    "docker-compose.yml"
    ".env"
    "README.md"
) do (
    if exist %%f (
        echo ✓ %%f
    ) else (
        echo ✗ %%f
    )
)

echo.
echo Checking dependencies...
if exist "node_modules" (
    echo ✓ node_modules installed
) else (
    echo ⚠ node_modules not found - Run: npm install
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║              Verification Complete!                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Next steps:
echo   1. Install dependencies: npm install
echo   2. Start Docker services: docker-compose up -d
echo   3. Run dev server: npm run dev
echo   4. Check API docs: http://localhost:3000/api-docs
echo.
