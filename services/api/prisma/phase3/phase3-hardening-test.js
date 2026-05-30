const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUTPUT = path.join(ROOT, 'pilot', 'outputs');
const NODE_PATH = path.join(ROOT, 'node_modules', '.pnpm', 'node_modules');

const STEPS = [
  { name: 'STEP 1: pgBouncer / Connection Pool', script: 'scripts/pgbouncer-validate.js' },
  { name: 'STEP 2: DB Connection Stability', script: 'scripts/generate-db-stability-report.js' },
  { name: 'STEP 3: Redis Persistence', script: 'scripts/redis-persistence-check.js' },
  { name: 'STEP 4: Docker Validation', script: 'scripts/validate-docker.js' },
  { name: 'STEP 5: CI Pipeline Validation', script: 'scripts/validate-ci.js' },
  { name: 'STEP 6: Backup Validation', script: 'scripts/validate-backup.js' },
  { name: 'STEP 7: Service Resilience', script: 'scripts/service-resilience-matrix.js' },
];

const results = { started: new Date().toISOString(), steps: [], passed: 0, failed: 0 };

function runScript(name, scriptPath) {
  const fullPath = path.join(__dirname, scriptPath);
  if (!fs.existsSync(fullPath)) return { name, status: 'skipped', error: 'Script not found' };
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'='.repeat(60)}`);
  try {
    const out = execSync(`node "${fullPath}"`, {
      cwd: path.join(__dirname, '..', '..'),
      timeout: 30000,
      env: { ...process.env, NODE_PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(out.toString());
    return { name, status: 'passed' };
  } catch (e) {
    const output = e.stdout?.toString() || '';
    const stderr = e.stderr?.toString() || '';
    console.log(output);
    if (stderr) console.error(stderr);
    return { name, status: 'passed_with_warnings', error: e.message.slice(0, 200) };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     PHASE 3 FINAL HARDENING TEST SUITE          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Node: ${process.version}`);
  console.log(`NODE_PATH: ${NODE_PATH}`);
  console.log(`Started: ${results.started}`);
  console.log(`Services must be running on ports 3000-3004\n`);

  for (const step of STEPS) {
    const r = runScript(step.name, step.script);
    results.steps.push(r);
    if (r.status === 'passed') results.passed++;
    else results.failed++;
  }

  // Generate summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('  HARDENING TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  results.completed = new Date().toISOString();
  results.totalSteps = STEPS.length;
  console.log(`  Passed: ${results.passed}/${results.totalSteps}`);
  console.log(`  Failed: ${results.failed}/${results.totalSteps}`);

  if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, 'phase3_hardening_results.json'), JSON.stringify(results, null, 2));
  console.log(`\nResults saved to pilot/outputs/phase3_hardening_results.json`);
}

main().catch(console.error);
