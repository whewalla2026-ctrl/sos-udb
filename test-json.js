const express = require('express');
const app = express();
app.use(express.json({limit: '50kb'}));
app.post('/test', (req, res) => {
  console.log('Body:', req.body);
  res.json({received: req.body});
});
app.listen(3002, () => console.log('Test server on 3002'));
