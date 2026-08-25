@echo off
title 4NGEL
echo ========================================
echo  4NGEL - Video Downloader
echo ========================================
echo.

node "%~dp0dist\cli.js" %*

echo.
echo ========================================
echo  Appuyez sur une touche pour fermer...
echo ========================================
pause > nul