@echo off
cd /d "%~dp0"
echo Dang mo ung dung quan ly co phieu...
echo Neu cua so nay dang mo thi server dang chay.
echo Dia chi: http://127.0.0.1:8770/stock-portfolio.html
start "" "http://127.0.0.1:8770/stock-portfolio.html"
node stock-server.js
pause
