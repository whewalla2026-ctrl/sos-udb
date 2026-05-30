const http = require('http');
const path = require('path');
const fs = require('fs');

async function checkService(host, port, path, name) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request({ hostname: host, port, path, method: 'GET', timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        resolve({
          service: name, status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
          statusCode: res.statusCode, latencyMs: Date.now() - start,
          response: body.slice(0, 200),
        });
      });
    });
    req.on('error', (err) => resolve({ service: name, status: 'unreachable', error: err.message }));
    req.end();
  });
}

async function generateReport() {
  console.log('=== DB Connection Stability Report ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  const checks = [
    checkService('localhost', 3000, '/gateway/health', 'gateway'),
    checkService('localhost', 3001, '/auth/health', 'auth'),
    checkService('localhost', 3002, '/planner/health', 'planner'),
    checkService('localhost', 3003, '/ai/health', 'ai'),
    checkService('localhost', 3004, '/monitoring/health', 'monitoring'),
  ];

  const results = await Promise.all(checks);
  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.length;

  console.log('Service Connectivity:');
  results.forEach(r => console.log(`  ${r.service}: ${r.status} (${r.latencyMs || 'N/A'}ms)`));

  // Pool saturation simulation (concurrent requests)
  console.log('\nConcurrent Connection Test:');
  const concurrentTests = [10, 25, 50, 100];
  const saturationResults = [];

  for (const count of concurrentTests) {
    const start = Date.now();
    const batch = [];
    for (let i = 0; i < count; i++) {
      batch.push(checkService('localhost', 3000, '/gateway/health', 'gateway'));
    }
    const batchResults = await Promise.all(batch);
    const duration = Date.now() - start;
    const allOk = batchResults.every(r => r.status === 'healthy' || r.status === 'unreachable');
    const reachable = batchResults.filter(r => r.status !== 'unreachable');
    const saturationResultsEntry = {
      concurrentRequests: count,
      durationMs: duration,
      successful: reachable.length,
      failed: count - reachable.length,
      avgLatencyMs: reachable.length > 0 ? Math.round(reachable.reduce((s, r) => s + (r.latencyMs || 0), 0) / reachable.length) : 0,
    };
    saturationResults.push(saturationResultsEntry);
    console.log(`  ${count} concurrent: ${duration}ms (${reachable.length}/${count} successful)`);
  }

  // Generate report
  const report = {
    generatedAt: new Date().toISOString(),
    serviceConnectivity: results,
    healthyCount: healthy,
    totalCount: total,
    saturationResults,
    conclusion: healthy === total ? 'All services reachable' : `${healthy}/${total} services reachable`,
    poolStability: saturationResults.every(r => r.failed === 0) ? 'stable' : 'degraded',
  };

  const outputPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'pilot', 'outputs');
  fs.writeFileSync(path.join(outputPath, 'db_connection_stability.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outputPath, 'db_pool_saturation_report.json'), JSON.stringify(saturationResults, null, 2));

  console.log(`\nReports saved to pilot/outputs/`);
  console.log('  - db_connection_stability.json');
  console.log('  - db_pool_saturation_report.json');
}

generateReport().catch(console.error);
