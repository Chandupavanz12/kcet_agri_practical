import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 5001,
  path: '/uploads/images/specimen1.jpg',
  method: 'GET'
}, res => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => console.log("Body length:", Buffer.concat(chunks).length, "Status:", res.statusCode, "Type:", res.headers['content-type']));
});
req.end();
