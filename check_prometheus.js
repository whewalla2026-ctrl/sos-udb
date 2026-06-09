const http = require('http');

const options = {
  hostname: 'udb-prometheus',
  port: 9090,
  path: '/api/v1/targets',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const targets = parsed.data.activeTargets;
      const up = targets.filter(t => t.health === 'up').length;
      console.log('UP: ' + up + '/' + targets.length);
      targets.forEach(t => {
        console.log('  ' + (t.labels.job || '?') + ': ' + t.health);
      });
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
