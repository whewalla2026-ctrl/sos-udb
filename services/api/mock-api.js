const http = require('http');

const port = 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    let x = 0;
    for(let i=0; i<10000; i++) x += i;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', service: 'udb-api', load: x }));
  } else if (req.url === '/api/graphql') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: { syncUUP: { success: true } } }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Mock API listening on port ${port}`);
});
