@echo off
echo Building ShopPOS Installer...
echo.

REM Set environment variable to disable code signing
set CSC_IDENTITY_AUTO_DISCOVERY=false

REM Build the React app
echo Step 1: Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Building installer...
call npx electron-builder --win nsis --config.forceCodeSigning=false

echo.
echo Done! Check dist-electron folder for the installer.
pause
