@echo off
echo ===================================================
echo Ada Lokanta - Site ve Yonetim Paneli Baslatiliyor...
echo ===================================================
echo.
echo Lutfen bu siyah ekrani kapatmayin! Sitenizin calismasi icin acik kalmasi gereklidir.
echo.

:: Tarayicida siteyi otomatik ac
start "" http://localhost:8080

:: Node sunucusunu baslat
node server.js

pause
