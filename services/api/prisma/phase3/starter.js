const { spawn } = require('child_process');
const path = require('path');

const REPO = 'D:\\SOS-UDB';
const BASE = path.join(REPO, 'services', 'api', 'prisma', 'phase3');
const NODE_PATH = path.join(REPO, 'node_modules', '.pnpm', 'node_modules');

const SERVICES = [
  { name: 'auth-service', script: 'services/auth-service.js', port: 3001 },
  { name: 'planner-service', script: 'services/planner-service.js', port: 3002 },
  { name: 'ai-service', script: 'services/ai-service.js', port: 3003 },
  { name: 'monitoring-service', script: 'services/monitoring-service.js', port: 3004 },
  { name: 'api-gateway', script: 'gateway.js', port: 3000 },
];

const children = [];

async function start() {
  for (const svc of SERVICES) {
    console.log(`Starting ${svc.name} on :${svc.port}...`);
    const child = spawn('node', [path.join(BASE, svc.script)], {
      cwd: REPO,
      env: {
        NODE_PATH,
        DATABASE_URL: 'postgresql://udb:udb@localhost:5432/udb?schema=public',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'dev-secret-phase3-2026-32char-minimum!!',
        PORT: String(svc.port),
        PATH: process.env.PATH,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', d => process.stdout.write(`[${svc.name}] ${d}`));
    child.stderr.on('data', d => process.stderr.write(`[${svc.name}] ${d}`));
    child.on('exit', (code, sig) => console.log(`${svc.name} exited: code=${code} signal=${sig}`));
    children.push(child);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\nAll services started. Waiting for readiness...');
  await new Promise(r => setTimeout(r, 4000));

  const http = require('http');
  for (const svc of SERVICES) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${svc.port}/monitoring/health`, res => { res.resume(); resolve(); });
        req.on('error', reject);
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      console.log(`${svc.name} :${svc.port}: READY`);
    } catch {
      console.log(`${svc.name} :${svc.port}: NOT READY`);
    }
  }
  console.log('\nGateway: http://localhost:3000');
}

process.on('SIGINT', () => { children.forEach(c => c.kill()); process.exit(); });
process.on('SIGTERM', () => { children.forEach(c => c.kill()); process.exit(); });

start();
