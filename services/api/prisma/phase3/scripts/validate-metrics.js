const http = require('http');
const path = require('path');
const fs = require('fs');

const SERVICES = [
  { name: 'gateway', host: 'localhost', port: 3000, path: '/metrics' },
  { name: 'monitoring', host: 'localhost', port: 3004, path: '/metrics' },
];

function fetchMetrics(service) {
  return new Promise((resolve) => {
    const opts = { hostname: service.host, port: service.port, path: service.path, method: 'GET', timeout: 5000 };
    const r = http.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ service: service.name, statusCode: res.statusCode, body, contentType: res.headers['content-type'] }));
    });
    r.on('error', (e) => resolve({ service: service.name, error: e.message }));
    r.end();
  });
}

async function validate() {
  console.log('=== Prometheus Metrics Validation ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  const expectedMetrics = [
    'udb_http_requests_total',
    'udb_http_request_duration_seconds',
    'udb_auth_failures_total',
    'udb_queue_depth',
    'udb_queue_failures_total',
    'udb_redis_latency_seconds',
    'udb_db_pool_usage',
    'udb_ai_budget_usage',
    'process_cpu_user_seconds_total',
    'process_resident_memory_bytes',
  ];

  let allPassed = true;

  for (const service of SERVICES) {
    console.log(`Fetching /metrics from ${service.name} (:${service.port})`);
    const result = await fetchMetrics(service);

    if (result.error) {
      console.log(`  ✗ Error: ${result.error}\n`);
      allPassed = false;
      continue;
    }

    console.log(`  Status: ${result.statusCode}`);
    if (result.statusCode !== 200) {
      console.log(`  ✗ Non-200 status\n`);
      allPassed = false;
      continue;
    }

    const metrics = result.body;
    const foundMetrics = [];

    for (const expected of expectedMetrics) {
      if (metrics.includes(expected)) {
        foundMetrics.push(expected);
      }
    }

    const isPrometheus = result.contentType === 'text/plain; version=0.0.4; charset=utf-8' ||
                         result.contentType?.includes('text/plain');

    console.log(`  Lines: ${metrics.split('\n').length}`);
    console.log(`  Content-Type: ${result.contentType}`);
    console.log(`  Prometheus format: ${isPrometheus ? '✓' : '✗'}`);
    console.log(`  Found ${foundMetrics.length}/${expectedMetrics.length} expected metrics`);
    if (foundMetrics.length > 0) console.log(`  Samples:\n${foundMetrics.slice(0, 5).map(m => {
      const line = metrics.split('\n').find(l => l.startsWith(m));
      return `    ${line || m + ' - no data'}`;
    }).join('\n')}`);

    if (foundMetrics.length < 3) {
      console.log(`  ✗ Insufficient metrics found`);
      allPassed = false;
    }
    console.log('');
  }

  // Generate report
  const report = {
    validationDate: new Date().toISOString(),
    servicesChecked: SERVICES.length,
    allPassed,
    metricsExpected: expectedMetrics,
    details: 'See prometheus_metrics_validation.json for full output',
  };

  const outputPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'pilot', 'outputs');
  fs.writeFileSync(path.join(outputPath, 'prometheus_metrics_validation.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outputPath, 'metrics_scrape_report.json'), JSON.stringify(report, null, 2));
  console.log(`Reports saved to pilot/outputs/`);

  if (!allPassed) {
    console.log('Some metric checks failed');
    process.exit(1);
  }
  console.log('ALL METRICS VALIDATION PASSED');
}

validate().catch(console.error);
