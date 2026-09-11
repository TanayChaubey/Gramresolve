import crypto from 'node:crypto';

const users = new Map();
const grievances = new Map();
const panchayats = new Map();

export const store = {
  users,
  grievances,
  panchayats,
};

export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}
