import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const queryToken = req.query.token;

  let token = null;
  if (header && header.startsWith('Bearer ')) {
    token = header.slice('Bearer '.length);
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({ message: 'Missing Authorization token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
