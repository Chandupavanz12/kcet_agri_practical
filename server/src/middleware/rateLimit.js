export function simpleRateLimit({ windowMs = 60_000, max = 20, keyGenerator } = {}) {
  const hits = new Map();

  function cleanup(now) {
    for (const [k, v] of hits.entries()) {
      if (!v || now >= v.resetAt) {
        hits.delete(k);
      }
    }
  }

  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 10_000) {
      cleanup(now);
    }

    const key = typeof keyGenerator === 'function' ? keyGenerator(req) : `${req.ip}`;
    const entry = hits.get(key);

    if (!entry || now >= entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - 1)));
      return next();
    }

    entry.count += 1;
    hits.set(key, entry);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return res.status(429).json({ message: 'Too many requests' });
    }

    return next();
  };
}
