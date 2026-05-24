@echo off
chcp 65001 >nul
echo ================================================
echo  AI Intelligence Hub + Cloudflare Tunnel
echo ================================================
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend
set CF=%ROOT%cloudflared.exe

:: ── 1. הפעל Backend ──────────────────────────────
echo [1/3] מפעיל FastAPI backend...
start "AI-Backend" cmd /k "cd /d %BACKEND% && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

:: ── 2. הפעל Frontend ─────────────────────────────
echo [2/3] מפעיל Next.js frontend...
start "AI-Frontend" cmd /k "cd /d %FRONTEND% && npm run dev"
timeout /t 2 /nobreak >nul

:: ── 3. Cloudflare Tunnel ─────────────────────────
echo [3/3] פותח Cloudflare Tunnel...
echo.
echo ┌─────────────────────────────────────────────┐
echo │  כשה-URL יופיע — העתק אותו ל-Base44!       │
echo │  נראה כמו: https://xxxx.trycloudflare.com  │
echo └─────────────────────────────────────────────┘
echo.
%CF% tunnel --url http://localhost:8000

pause
