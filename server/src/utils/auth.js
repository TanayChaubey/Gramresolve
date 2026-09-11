import crypto from 'node:crypto';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const sessions = new Map();

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

export function getSession(token) {
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) sessions.delete(token);
    return null;
  }
  return session;
}

export function authRequired(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const session = getSession(token);

  if (!session) return res.status(401).json({ error: 'Authentication required' });
  req.userId = session.userId;
  next();
}
