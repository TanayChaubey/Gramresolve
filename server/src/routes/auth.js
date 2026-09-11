import { Router } from 'express';
import { store, createId } from '../data/store.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createSession, authRequired } from '../utils/auth.js';

const router = Router();

function publicUser(user) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

router.post('/register', (req, res) => {
  const { name, phone, password, role = 'citizen', panchayatId = null } = req.body;

  if (!name?.trim() || !phone?.trim() || !password) {
    return res.status(400).json({ error: 'Name, phone and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must contain at least 6 characters' });
  }
  if (!['citizen', 'official'].includes(role)) {
    return res.status(400).json({ error: 'Role must be citizen or official' });
  }
  if (role === 'official' && !panchayatId) {
    return res.status(400).json({ error: 'Panchayat ID is required for officials' });
  }

  const normalizedPhone = phone.trim();
  if ([...store.users.values()].some((user) => user.phone === normalizedPhone)) {
    return res.status(409).json({ error: 'An account with this phone already exists' });
  }

  const user = {
    id: createId('usr'),
    name: name.trim(),
    phone: normalizedPhone,
    role,
    panchayatId,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  store.users.set(user.id, user);
  const token = createSession(user.id);
  return res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  const user = [...store.users.values()].find((candidate) => candidate.phone === phone?.trim());

  if (!user || !verifyPassword(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
  }

  const token = createSession(user.id);
  return res.json({ token, user: publicUser(user) });
});

router.get('/me', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

export default router;
