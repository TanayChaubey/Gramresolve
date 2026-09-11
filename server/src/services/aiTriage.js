const CATEGORY_RULES = {
  water: ['water', 'handpump', 'tap', 'pipeline', 'tank', 'drinking', 'paani'],
  roads: ['road', 'pothole', 'street', 'bridge', 'footpath', 'sadak', 'gaddha'],
  sanitation: ['toilet', 'sewage', 'sanitation', 'filth', 'open defecation', 'shauchalay'],
  streetlights: ['streetlight', 'street light', 'lamp', 'dark road', 'bulb', 'light'],
  electricity: ['electricity', 'power cut', 'transformer', 'wire', 'pole', 'voltage', 'bijli'],
  drainage: ['drain', 'drainage', 'waterlogging', 'flooded lane', 'naali', 'nali'],
  waste: ['garbage', 'waste', 'rubbish', 'dump', 'dustbin', 'kachra'],
  public_health: ['hospital', 'clinic', 'medicine', 'ambulance', 'health', 'fever', 'disease', 'health centre'],
};

const DEPARTMENTS = {
  water: 'Water & Sanitation',
  roads: 'Roads & Infrastructure',
  sanitation: 'Water & Sanitation',
  streetlights: 'Electricity',
  electricity: 'Electricity',
  drainage: 'Water & Sanitation',
  waste: 'Waste Management',
  public_health: 'Health',
  other: 'Other',
};

const HIGH_SEVERITY = [
  'danger', 'dangerous', 'accident', 'injury', 'injured', 'fire', 'flood',
  'electrocution', 'shock', 'hospital', 'ambulance', 'death', 'dead',
  'contaminated', 'unsafe', 'emergency', 'urgent', 'collapsed', 'collapse',
];

const LOW_SEVERITY = ['minor', 'small', 'cosmetic', 'slight'];

const normalize = (value = '') => value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

const tokens = (value) => new Set(normalize(value).split(' ').filter((token) => token.length > 2));

function scoreCategory(text) {
  const scores = Object.fromEntries(Object.keys(CATEGORY_RULES).map((category) => [category, 0]));
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of keywords) {
      if (text.includes(normalize(keyword))) scores[category] += keyword.includes(' ') ? 2 : 1;
    }
  }
  return scores;
}

function calculateSeverity(text) {
  const highHits = HIGH_SEVERITY.filter((word) => text.includes(word)).length;
  const lowHits = LOW_SEVERITY.filter((word) => text.includes(word)).length;
  if (highHits >= 1) return { severity: 'high', confidence: Math.min(0.95, 0.72 + highHits * 0.06) };
  if (lowHits >= 1) return { severity: 'low', confidence: 0.82 };
  return { severity: 'medium', confidence: 0.7 };
}

function similarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

export function triageGrievance({ title, description, existingGrievances = [] }) {
  const text = normalize(`${title} ${description}`);
  const scores = scoreCategory(text);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestCategory, bestScore] = ranked[0] || ['other', 0];
  const [secondCategory, secondScore] = ranked[1] || ['other', 0];

  const category = bestScore > 0 ? bestCategory : 'other';
  const categoryConfidence = bestScore === 0
    ? 0.35
    : Math.min(0.98, 0.62 + bestScore * 0.08 + Math.max(0, bestScore - secondScore) * 0.04);

  const { severity, confidence: severityConfidence } = calculateSeverity(text);
  const combined = `${title} ${description}`;
  const duplicateCandidates = existingGrievances
    .filter((item) => !['resolved', 'reopened'].includes(item.status))
    .map((item) => ({ id: item.id, title: item.title, score: similarity(combined, `${item.title} ${item.description}`) }))
    .filter((item) => item.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const duplicateSignal = duplicateCandidates[0]?.score || 0;
  const summary = title?.trim() || description.trim().split(/[.!?]/)[0].slice(0, 120);

  return {
    category,
    severity,
    department: DEPARTMENTS[category],
    summary,
    categoryConfidence: Number(categoryConfidence.toFixed(2)),
    severityConfidence: Number(severityConfidence.toFixed(2)),
    duplicateSignal: Number(duplicateSignal.toFixed(2)),
    duplicateCandidates,
    explanation: `Classified as ${category.replace('_', ' ')} based on the reported issue; severity is ${severity}.`,
    engine: 'GramResolve Triage v1',
  };
}
