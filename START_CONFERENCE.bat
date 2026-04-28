@echo off
REM ============================================================
REM  Panos VR — Conference Launcher
REM  One-click start for the booth laptop. No terminal needed.
REM
REM  What it does:
REM    1. Frees port 8080 (kills any leftover server)
REM    2. Starts a static server on dist/ at port 8080
REM    3. Opens Chrome on the laptop for the spectator TV
REM    4. Prints the LAN IP so the operator can give Quest 3
REM       users the URL to type in the headset browser
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo === Panos VR Conference Launcher ===
echo.

REM ---- 1. Kill anything already on port 8080 ----
echo [1/4] Freeing port 8080...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo     - Killing existing process PID %%P
    taskkill /F /PID %%P >nul 2>&1
)

REM ---- 2. Make sure dist/ exists ----
if not exist "dist\index.html" (
    echo.
    echo [ERROR] dist\index.html not found.
    echo         Run "npm run build" before launching the conference server.
    echo.
    pause
    exit /b 1
)

REM ---- 3. Find the laptop's LAN IP (first non-loopback IPv4) ----
set "LAN_IP="
for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    if not defined LAN_IP (
        set "RAW_IP=%%I"
        REM strip leading space
        for /f "tokens=*" %%T in ("!RAW_IP!") do set "LAN_IP=%%T"
    )
)
if not defined LAN_IP set "LAN_IP=<your-laptop-ip>"

REM ---- 4. Start the static server in the background ----
echo [2/4] Starting server on port 8080...
start "Panos VR Server" /MIN cmd /c "npx serve dist -l 8080 --no-clipboard"

REM Give the server a couple of seconds to bind the port
echo [3/4] Waiting for server to come up...
timeout /t 2 /nobreak >nul

REM ---- 5. Open Chrome on the laptop for spectator mirroring ----
echo [4/4] Opening Chrome...
start chrome "http://localhost:8080"

echo.
echo ============================================================
echo   Server running at:
echo     Local (this laptop):  http://localhost:8080
echo     Quest 3 URL:          http://%LAN_IP%:8080
echo.
echo   Make sure the Quest 3 is on the SAME WiFi network as this
echo   laptop. Open the Quest browser and type the URL above.
echo.
echo   Leave this window open. When the conference is over, run
echo   STOP_CONFERENCE.bat to shut everything down cleanly.
echo ============================================================
echo.
pause
endlocal
