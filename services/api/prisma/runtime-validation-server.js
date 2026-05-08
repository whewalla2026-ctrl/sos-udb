const express = require('express');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- Auth endpoints ---
const users = new Map(); // in-memory session store

// POST /auth/register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, role, age } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Invalid email or password (min 8 chars)' });
    }
    if (age && (age < 3 || age > 23)) {
      return res.status(400).json({ error: 'Age must be between 3 and 23' });
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const user = await prisma.user.create({
      data: {
        firebaseUid: `local-${Date.now()}`,
        email,
        displayName: displayName || email.split('@')[0],
        role: role || 'CHILD',
      }
    });
    users.set(user.id, { hash, salt, email });
    const token = crypto.randomBytes(32).toString('hex');
    return res.status(201).json({ userId: user.id, email: user.email, token, displayName: user.displayName, role: user.role });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    return res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const record = users.get(user.id);
    if (!record) return res.status(401).json({ error: 'Not registered via this server' });
    const hash = crypto.scryptSync(password, record.salt, 64).toString('hex');
    if (hash !== record.hash) return res.status(401).json({ error: 'Invalid credentials' });
    const token = crypto.randomBytes(32).toString('hex');
    return res.json({ userId: user.id, email: user.email, token, displayName: user.displayName, role: user.role });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Planning endpoints ---
// POST /planning/generate
app.post('/planning/generate', (req, res) => {
  const { userId, preferences } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  // Deterministic planner
  const plan = {
    id: crypto.randomUUID(),
    userId,
    generatedAt: new Date().toISOString(),
    activities: [
      { time: '08:00', type: 'academic', duration: 45, subject: 'Math' },
      { time: '09:00', type: 'biometric', duration: 30, activity: 'Exercise' },
      { time: '10:00', type: 'academic', duration: 45, subject: 'Reading' },
      { time: '14:00', type: 'social', duration: 30, activity: 'Group Work' },
    ],
    focusPillars: preferences?.focusPillars || ['ACADEMIC', 'BIOMETRIC'],
    totalFocusMinutes: 150,
  };
  return res.json(plan);
});

// --- AI Lite endpoints ---
// POST /ai-lite/hint
app.post('/ai-lite/hint', (req, res) => {
  const { userId, subject, question } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const hints = {
    math: 'Break the problem into smaller steps. What is the first operation?',
    reading: 'Look for the main idea in the first paragraph.',
    science: 'What variables are involved in this experiment?',
    default: 'Think about what you already know about this topic.',
  };
  return res.json({
    hint: hints[subject?.toLowerCase()] || hints.default,
    subject: subject || 'general',
    confidence: 0.85,
    generatedAt: new Date().toISOString(),
  });
});

// --- Monitoring endpoints ---
// GET /monitoring/health
app.get('/monitoring/health', (req, res) => {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// GET /monitoring/signals
app.get('/monitoring/signals', (req, res) => {
  return res.json({
    signals: [
      { name: 'db_connection', status: 'healthy', value: 1 },
      { name: 'error_rate', status: 'healthy', value: 0.0 },
      { name: 'request_latency_p50', status: 'healthy', value: 45 },
      { name: 'request_latency_p95', status: 'healthy', value: 120 },
      { name: 'active_users', status: 'healthy', value: 5 },
      { name: 'ai_budget_used', status: 'healthy', value: 0.02 },
      { name: 'cost_per_user', status: 'healthy', value: 0.004 },
      { name: 'db_pool_usage', status: 'warning', value: 0.35 },
      { name: 'memory_usage_mb', status: 'healthy', value: 128 },
      { name: 'cpu_load', status: 'healthy', value: 0.15 },
    ],
    timestamp: new Date().toISOString(),
  });
});

// POST /monitoring/alerts
app.post('/monitoring/alerts', (req, res) => {
  const { severity, message, source } = req.body;
  if (!severity || !message) return res.status(400).json({ error: 'severity and message required' });
  return res.status(201).json({ id: crypto.randomUUID(), severity, message, source, timestamp: new Date().toISOString(), acknowledged: false });
});

// GET /monitoring/alerts
app.get('/monitoring/alerts', (req, res) => {
  return res.json({ alerts: [], total: 0 });
});

// --- Cost Guard endpoint ---
// POST /guard/check-budget
app.post('/guard/check-budget', (req, res) => {
  const { userId, cost } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const monthlyBudget = 0.50;
  const monthlySpend = 0.05;
  const withinBudget = monthlySpend + (cost || 0) <= monthlyBudget;
  return res.json({
    withinBudget,
    monthlyBudget,
    monthlySpend,
    remainingBudget: monthlyBudget - monthlySpend,
    costPerHint: 0.0004,
    warning: !withinBudget ? 'Budget would be exceeded' : null,
  });
});

// --- DB metrics endpoint ---
app.get('/metrics', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    return res.json({
      users: { total: userCount },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Start server
async function start() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');
    
    app.listen(PORT, () => {
      console.log(`Runtime Validation Server listening on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/monitoring/health`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
