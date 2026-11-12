@echo off
title PAKDEE Server + LINE Bot Webhook Tunnel
cd /d "%~dp0"
echo Starting PAKDEE Web Server (Port 3000) + Cloudflare Tunnel + LINE Auto-Webhook...
npm run dev:bot
pause
