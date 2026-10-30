@echo off
cd /d "%~dp0.."
echo ===================================================
echo Ada Lokanta - Yonetim Paneli Baslatiliyor...
echo ===================================================
echo.
echo Lutfen bu siyah ekrani kapatmayin! Panelin calismasi icin acik kalmasi gereklidir.
echo.

:: Tarayicida admin panelini otomatik ac
start "" http://localhost:8080/admin.html

:: Node sunucusunu baslat
node server.js

pause
