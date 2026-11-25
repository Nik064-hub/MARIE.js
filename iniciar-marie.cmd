@echo off
rem Portable launcher for MARIE (Windows). Only requirement: Node.js LTS (includes npm).
setlocal
cd /d "%~dp0"
title MARIE

rem --- 1. Node.js and npm must be available in PATH
where node >nul 2>&1 || goto :no_node
where npm >nul 2>&1 || goto :no_node

rem --- 2. Node version must satisfy Vite 7: ^20.19 || ^22.12 || >=24
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>=24||(a==22&&b>=12)||(a==20&&b>=19)?0:1)" || goto :old_node

rem --- 3. Install dependencies only if missing or package-lock.json is newer
node -e "const f=require('fs');try{process.exit(f.statSync('node_modules/.package-lock.json').mtimeMs>=f.statSync('package-lock.json').mtimeMs?0:1)}catch{process.exit(1)}"
if errorlevel 1 (
    echo Installing dependencies ^(npm ci^)...
    call npm ci || goto :fail
)

rem --- 4. Port 5173 must be free
node -e "const s=require('net').createServer();s.once('error',()=>process.exit(1));s.listen(5173,'127.0.0.1',()=>s.close())" || goto :port_busy

rem --- 5. Start Vite; --open launches the browser once the server is ready
echo Starting MARIE at http://127.0.0.1:5173
echo Press Ctrl+C to stop the server.
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
goto :end

:no_node
echo ERROR: Node.js was not found.
echo Install the LTS version from https://nodejs.org, then close this window and run this file again.
goto :fail

:old_node
echo ERROR: Node.js is too old. MARIE needs Node.js 20.19+, 22.12+ or 24+.
echo Install the LTS version from https://nodejs.org and run this file again.
goto :fail

:port_busy
echo ERROR: Port 5173 is already in use. MARIE may already be running at http://127.0.0.1:5173
echo Otherwise, close the program using that port and try again.
goto :fail

:fail
echo.
echo MARIE could not be started.
:end
pause
