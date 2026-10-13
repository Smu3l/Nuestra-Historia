@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:menu
cls
echo ============================================================
echo   TELETRANSPORTE   -   el juego debe estar YA abierto
echo ============================================================
echo.
echo   1) casa                    8) Jefe: Distancia
echo   2) sendero_distancia       9) Jefe: Toxicidad
echo   3) pantano_toxicidad      10) Jefe: Desinteres
echo   4) valle_desinteres       11) Jefe: Inseguridad
echo   5) montanas_inseguridad   12) Jefe: Celos
echo   6) lago_celos             13) Jefe: Coleccionista
echo   7) reino_recuerdos
echo.
echo  20) pos  -  donde estoy     21) god  -  invencible
echo  22) silence                 23) quit -  cerrar el juego
echo   0) salir
echo.
set /p "op=Elige una opcion: "

set "m="
set "cmd="
if "%op%"=="1"  set "m=casa"
if "%op%"=="2"  set "m=sendero_distancia"
if "%op%"=="3"  set "m=pantano_toxicidad"
if "%op%"=="4"  set "m=valle_desinteres"
if "%op%"=="5"  set "m=montanas_inseguridad"
if "%op%"=="6"  set "m=lago_celos"
if "%op%"=="7"  set "m=reino_recuerdos"
if "%op%"=="8"  set "m=boss_distancia"
if "%op%"=="9"  set "m=boss_toxicidad"
if "%op%"=="10" set "m=boss_desinteres"
if "%op%"=="11" set "m=boss_inseguridad"
if "%op%"=="12" set "m=boss_celos"
if "%op%"=="13" set "m=boss_coleccionista"
if "%op%"=="20" set "cmd=pos"
if "%op%"=="21" set "cmd=god"
if "%op%"=="22" set "cmd=silence"
if "%op%"=="23" set "cmd=quit"
if "%op%"=="0"  exit /b

if defined cmd goto :run_cmd
if not defined m goto :invalid
goto :run_map

:run_map
set "xy="
set /p "xy=Tile x y opcional. Enter = llegada por defecto: "
if not defined xy goto :map_plain
set "q=!xy: =&y=!"
curl -s "http://127.0.0.1:8787/tp/!m!?x=!q!"
goto :after

:map_plain
curl -s "http://127.0.0.1:8787/tp/!m!"
goto :after

:run_cmd
curl -s "http://127.0.0.1:8787/!cmd!"
goto :after

:invalid
echo  Opcion no valida.

:after
echo.
echo ------------------------------------------------------------
goto menu
