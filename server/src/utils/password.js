import crypto from 'node:crypto';

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [iterations, salt, expected] = stored.split(':');
  if (!iterations || !salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(password, salt, Number(iterations), KEY_LENGTH, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
