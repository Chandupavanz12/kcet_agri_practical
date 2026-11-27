import jwt from 'jsonwebtoken';

const _onlineUsersMap = new Map(); // userId -> lastSeenMs
const _lastDbWriteMap = new Map(); // userId -> lastDbWriteMs

export function getOnlineUsersMap() {
  return _onlineUsersMap;
}

export function recordUserActivity(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return;
  const now = Date.now();
  _onlineUsersMap.set(uid, now);

  const lastWrite = _lastDbWriteMap.get(uid) || 0;
  if (now - lastWrite > 2 * 60 * 1000) {
    _lastDbWriteMap.set(uid, now);
    import('../models/index.js')
      .then(({ User }) => User.updateOne({ id: uid }, { $set: { last_active_at: new Date(now) } }).exec())
      .catch(() => {});
  }
}

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
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = payload;
    if (payload?.role === 'student') {
      recordUserActivity(payload.sub || payload.id);
    }
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
