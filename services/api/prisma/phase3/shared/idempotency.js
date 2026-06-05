function idempotent(redis, { trackHit } = {}) {
  return (req, res, next) => {
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey;
    if (!idempotencyKey) return next();
    // Check if already processed
    redis.get(`idempotent:${idempotencyKey}`).then((existing) => {
      if (existing) {
        if (trackHit) trackHit();
        return res.status(200).json(JSON.parse(existing));
      }
      // Store original send
      const originalSend = res.send.bind(res);
      res.send = (body) => {
        redis.setex(`idempotent:${idempotencyKey}`, 86400, typeof body === 'string' ? body : JSON.stringify(body)).catch(() => {});
        return originalSend(body);
      };
      next();
    }).catch(() => next());
  };
}

async function deduplicateJob(redis, jobId, ttlSeconds = 300) {
  const key = `dedup:${jobId}`;
  const existing = await redis.get(key);
  if (existing) return true;
  await redis.setex(key, ttlSeconds, '1');
  return false;
}

module.exports = { idempotent, deduplicateJob };
