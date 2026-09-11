const grievances = new Map();

const CATEGORIES = [
  'roads',
  'water',
  'sanitation',
  'streetlights',
  'electricity',
  'drainage',
  'waste',
  'public_health',
  'other',
];

const STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'reopened', 'escalated'];

const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const grievanceStore = {
  grievances,
  CATEGORIES,
  STATUSES,
  generateId,
};
