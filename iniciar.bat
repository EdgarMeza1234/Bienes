@echo off
echo ============================================
echo   Sistema ONTs - Unidad de Bienes
echo   Cooperativa de Telecomunicaciones Potosi
echo ============================================
echo.

REM Verificar si Node.js esta instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Descargalo desde: https://nodejs.org
    pause
    exit /b
)

echo [1/3] Verificando base de datos...
cd /d "%~dp0backend"
if not exist "database\ont_bienes.db" (
    echo     Creando base de datos...
    node database/init.js
) else (
    echo     Base de datos ya existe.
)

echo.
echo [2/3] Compilando frontend...
cd /d "%~dp0frontend"
if not exist "dist" (
    npx vite build
) else (
    echo     Frontend ya compilado.
)

echo.
echo [3/3] Iniciando servidor...
echo.
cd /d "%~dp0backend"
node server.js
pause
