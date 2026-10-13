@echo off
cd /d "%~dp0"
echo ============================================================
echo   ABRIENDO EL JUEGO CON LA CONSOLA DE TELETRANSPORTE
echo ============================================
echo.
echo  Deja esta ventana ABIERTA mientras juegas.
echo  Para moverte, abre "Teletransportarme.bat" (doble clic).
echo.
call npm run tp
pause
