import http from 'http';

function doLogin(email, password) {
  const req = http.request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/student/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => console.log(`${email}: HTTP ${res.statusCode} ${raw}`));
  });
  req.write(JSON.stringify({ email, password }));
  req.end();
}

doLogin('vivekmpvivek05@gmail.com', 'password');
doLogin('nonexistent@example.com', 'pwd');
