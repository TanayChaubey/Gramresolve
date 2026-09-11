import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import panchayatRouter from './routes/panchayats.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api', (_req, res) => {
  res.json({
    name: 'GramResolve API',
    version: '0.2.0',
    status: 'running',
  });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/panchayats', panchayatRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(config.port, () => {
  console.log(`GramResolve API listening on port ${config.port}`);
});
