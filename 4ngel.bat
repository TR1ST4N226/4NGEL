@echo off
setlocal
title 4NGEL
echo ========================================
echo  4NGEL - Video Downloader
echo ========================================
echo.

if not defined YT_DLP_COOKIES_FROM_BROWSER if exist "%APPDATA%\Opera Software\Opera GX Stable\Default\Network\Cookies" set "YT_DLP_COOKIES_FROM_BROWSER=chromium:%APPDATA%\Opera Software\Opera GX Stable\Default"

pushd "%~dp0"
if not exist "dist\cli.js" (
  echo Build files not found. Preparing 4NGEL for first launch...
  where node > nul 2>&1
  if errorlevel 1 (
    echo ERROR: Node.js is required. Install Node.js 18 or newer.
    set "APP_EXIT_CODE=1"
    goto :finish
  )
  where npm > nul 2>&1
  if errorlevel 1 (
    echo ERROR: npm was not found. Reinstall Node.js with npm included.
    set "APP_EXIT_CODE=1"
    goto :finish
  )
  call npm ci
  if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    set "APP_EXIT_CODE=1"
    goto :finish
  )
  call npm run build
  if errorlevel 1 (
    echo ERROR: Build failed.
    set "APP_EXIT_CODE=1"
    goto :finish
  )
)

node "%~dp0dist\cli.js" %*
set "APP_EXIT_CODE=%ERRORLEVEL%"

:finish
popd
echo.
echo ========================================
echo  Appuyez sur une touche pour fermer...
echo ========================================
pause > nul
endlocal & exit /b %APP_EXIT_CODE%