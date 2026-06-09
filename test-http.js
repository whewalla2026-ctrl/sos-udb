const http = require('http');

const data = JSON.stringify({email: 'test', password: 'test'});
const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/test',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
