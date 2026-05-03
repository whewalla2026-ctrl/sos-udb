const autocannon = require('autocannon');

const url = 'http://localhost:3000/health'; // Target the API health endpoint

console.log(`Starting stress test against ${url}...`);

const instance = autocannon({
  url: url,
  connections: 100, // Number of concurrent connections
  pipelining: 1,
  duration: 10 // Run for 10 seconds
}, (err, results) => {
  if (err) {
    console.error('Stress test failed:', err);
  } else {
    console.log('\n--- Stress Test Results ---');
    console.log(`Total Requests: ${results.requests.total}`);
    console.log(`Avg Latency: ${results.latency.average} ms`);
    console.log(`p99 Latency: ${results.latency.p99} ms`);
    console.log(`Throughput: ${results.throughput.average} bytes/sec`);
    console.log(`Errors: ${results.errors}`);
    console.log('---------------------------\n');
    console.log('Stress test completed successfully.');
  }
});

// Display real-time progress
autocannon.track(instance, { renderProgressBar: true });
