@echo off
SET NODE_PATH=D:\SOS-UDB\node_modules\.pnpm\node_modules
SET DATABASE_URL=postgresql://udb:udb@localhost:5432/udb?schema=public
SET REDIS_URL=redis://localhost:6379
SET JWT_SECRET=dev-secret-phase3-2026-32char-minimum!!

start "auth-service" /B node D:\SOS-UDB\services\api\prisma\phase3\services\auth-service.js
timeout /T 3 /NOBREAK >nul
start "planner-service" /B node D:\SOS-UDB\services\api\prisma\phase3\services\planner-service.js
timeout /T 3 /NOBREAK >nul
start "ai-service" /B node D:\SOS-UDB\services\api\prisma\phase3\services\ai-service.js
timeout /T 3 /NOBREAK >nul
start "monitoring-service" /B node D:\SOS-UDB\services\api\prisma\phase3\services\monitoring-service.js
timeout /T 3 /NOBREAK >nul
start "gateway" /B node D:\SOS-UDB\services\api\prisma\phase3\gateway.js
timeout /T 5 /NOBREAK >nul
echo All services started
netstat -ano | findstr ":3000 :3001 :3002 :3003 :3004"
