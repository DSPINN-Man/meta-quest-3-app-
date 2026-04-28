@echo off
REM ============================================================
REM  Panos VR — Conference Shutdown
REM  Cleanly kills the static server on port 8080.
REM ============================================================

echo.
echo === Stopping Panos VR conference server ===
echo.

set FOUND=0
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    set FOUND=1
    echo Killing process PID %%P on port 8080...
    taskkill /F /PID %%P >nul 2>&1
)

if "%FOUND%"=="0" (
    echo No server was running on port 8080.
) else (
    echo Server stopped.
)

REM Also close the minimised "Panos VR Server" window if it's still around
taskkill /FI "WINDOWTITLE eq Panos VR Server" /T /F >nul 2>&1

echo.
pause
