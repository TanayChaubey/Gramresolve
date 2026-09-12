import express from 'express';
import { store, createId } from '../data/store.js';
import { hashPassword } from '../utils/password.js';
import { createSession } from '../utils/auth.js';

const router = express.Router();

router.post('/bootstrap', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });

  let panchayat = store.panchayats.get('demo-panchayat');
  if (!panchayat) {
    panchayat = {
      id: 'demo-panchayat', name: 'Demo Panchayat', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh',
      departments: ['Water & Sanitation', 'Roads & Infrastructure', 'Electricity', 'Waste Management', 'Health', 'Other'],
      createdAt: new Date().toISOString(),
    };
    store.panchayats.set(panchayat.id, panchayat);
  }

  const accounts = [
    { phone: '9999999999', name: 'Demo Citizen', role: 'citizen' },
    { phone: '8888888888', name: 'Panchayat Official', role: 'official' },
  ];

  const users = accounts.map((account) => {
    let user = [...store.users.values()].find((candidate) => candidate.phone === account.phone);
    if (!user) {
      user = { id: createId('usr'), ...account, panchayatId: panchayat.id, passwordHash: hashPassword('demo123'), createdAt: new Date().toISOString() };
      store.users.set(user.id, user);
    }
    return { id: user.id, name: user.name, phone: user.phone, role: user.role, panchayatId: user.panchayatId };
  });

  const citizen = users.find((user) => user.role === 'citizen');
  const official = users.find((user) => user.role === 'official');
  res.json({ panchayat, citizen, official, citizenToken: createSession(citizen.id), officialToken: createSession(official.id) });
});

export default router;
