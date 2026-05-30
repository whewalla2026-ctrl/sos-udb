const { spawn } = require('child_process');
const path = require('path');

const BASE = path.join(__dirname);
const SERVICES = [
  { name: 'auth-service', script: 'services/auth-service.js', port: 3001 },
  { name: 'planner-service', script: 'services/planner-service.js', port: 3002 },
  { name: 'ai-service', script: 'services/ai-service.js', port: 3003 },
  { name: 'monitoring-service', script: 'services/monitoring-service.js', port: 3004 },
  { name: 'api-gateway', script: 'gateway.js', port: 3000 },
];

function waitForPort(port, timeoutMs = 20000) {
  const http = require('http');
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(`http://localhost:${port}/monitoring/health`, (res) => { res.resume(); resolve(true); });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) { resolve(false); return; }
        setTimeout(check, 500);
      });
      req.setTimeout(2000, () => { req.destroy(); setTimeout(check, 500); });
    };
    check();
  });
}

async function start() {
  const children = [];
  for (const svc of SERVICES) {
    console.log(`Starting ${svc.name} on :${svc.port}...`);
    const child = spawn('node', [path.join(BASE, svc.script)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: path.join(BASE, '..', '..', '..', '..'),
      env: { ...process.env, PORT: String(svc.port) },
    });
    child.stdout.on('data', d => process.stdout.write(`[${svc.name}] ${d}`));
    child.stderr.on('data', d => process.stderr.write(`[${svc.name}] ${d}`));
    child.on('exit', (code) => console.log(`${svc.name} exited with code ${code}`));
    children.push(child);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('\nWaiting for all services to be ready...');
  for (const svc of SERVICES) {
    const ready = await waitForPort(svc.port);
    console.log(`${svc.name} on :${svc.port}: ${ready ? 'READY' : 'TIMEOUT'}`);
  }
  console.log('\nAll services started. Gateway: http://localhost:3000');
  
  // Handle shutdown
  process.on('SIGINT', () => { children.forEach(c => c.kill()); process.exit(); });
  process.on('SIGTERM', () => { children.forEach(c => c.kill()); process.exit(); });
}
start();
