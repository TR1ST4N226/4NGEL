@echo off
title 4NGEL
echo ========================================
echo  4NGEL - Video Downloader
echo ========================================
echo.

if not defined YT_DLP_COOKIES_FROM_BROWSER if exist "%APPDATA%\Opera Software\Opera GX Stable\Default\Network\Cookies" set "YT_DLP_COOKIES_FROM_BROWSER=chromium:%APPDATA%\Opera Software\Opera GX Stable\Default"

node "%~dp0dist\cli.js" %*

echo.
echo ========================================
echo  Appuyez sur une touche pour fermer...
echo ========================================
pause > nul