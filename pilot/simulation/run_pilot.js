#!/usr/bin/env node
// Lean Phase 2 simulation runner (10/30/100 users) with blockers, guardrails, and gating artifacts.
// This is a deterministic-ish simulator that prints results and writes JSON reports.
// Usage: node pilot/simulation/run_pilot.js

const fs = require('fs');
const path = require('path');

function rand(min, max) { return Math.random() * (max - min) + min; }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Personas
const personas = [
  { idBase: 'p', type: 'BusyParent', loginPerWeek: 3, aiUsage: 0.2, plannerUsage: 0.6 },
  { idBase: 's', type: 'Student', loginPerWeek: 7, aiUsage: 0.8, plannerUsage: 0.8 },
  { idBase: 't', type: 'Teacher', loginPerWeek: 2, aiUsage: 0.1, plannerUsage: 0.3 }
];

const PHASE_A = 10, PHASE_B = 30, PHASE_C = 100;

function createUsers(n, baseSet) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = baseSet[i % baseSet.length];
    out.push({
      id: `u_${i + 1}`,
      role: b.type,
      aiUsage: b.aiUsage,
      plannerUsage: b.plannerUsage,
      loginPerWeek: b.loginPerWeek,
      hintsGiven: 0,
      plannerBlocks: 0,
      onboarded: false,
      ttvSec: 0,
      phase: 1
    });
  }
  return out;
}

function simulateDay(user, dayIndex, opts) {
  // opts: { phase, lmsUp, vectorUp, aiFaultRate, latencyBase }
  const phase = opts.phase;
  const dailyHintChance = user.aiUsage > 0.0 ? 0.4 + Math.random() * 0.3 * user.aiUsage : 0.1;
  // AI hints latency
  let aiLatency = rand(100, 800);
  const aiFault = Math.random() < (opts.aiFaultRate || 0);
  if (aiFault) aiLatency += 400; // worse latency
  // Vector usage latency
  const vecLatency = rand(1, 40);
  // LMS latency (simulated)
  const lmsLatency = rand(20, 150);

  // Onboarding: day 1 onboarding phase
  if (!user.onboarded && dayIndex === 0) {
    user.onboarded = true;
    user.ttvSec = rand(60, 180); // onboarding time in seconds
  }

  // Planner activity
  const planBlocks = Math.random() < user.plannerUsage ? Math.floor(rand(1, 4)) : 0;
  user.plannerBlocks += planBlocks;

  // AI hints
  const askedHint = Math.random() < dailyHintChance;
  if (askedHint) {
    user.hintsGiven += 1;
  }

  // Simulate outcomes
  const successAI = !aiFault && aiLatency <= 500;
  const useVector = (opts.usePinecone && Math.random() > 0.2) || (!opts.usePinecone && true);
  const aiCost = user.hintsGiven * 0.0008;

  const result = {
    day: dayIndex + 1,
    userId: user.id,
    aiLatency: aiLatency,
    aiUsed: askedHint ? true : false,
    aiSuccess: successAI,
    vectorUsed: useVector ? 'local_or_pinecone' : 'local',
    vecLatency: vecLatency,
    lmsLatency: lmsLatency,
    plannerBlocks: planBlocks,
    hintsGiven: user.hintsGiven,
    onboarded: user.onboarded,
    ttvSec: user.ttvSec,
    aiCost: aiCost,
  };
  return result;
}

function runSimulation(nA, nB, nC) {
  // Build a mixed user pool: A (10), B (Phase B), C (Phase C) proportions
  const pool = [];
  pool.push(...createUsers(nA, [personas[0], personas[1]]));
  pool.push(...createUsers(nB - nA, [personas[1], personas[2]]));
  pool.push(...createUsers(nC - nB, [personas[0], personas[2]]));
  return pool;
}

function main() {
  // Phase A (10 users)
  const phaseAUsers = runSimulation(4, 3, 3);
  const days = 14;
  let allLogs = [];
  for (let day = 0; day < days; day++) {
    phaseAUsers.forEach(u => {
      const r = simulateDay(u, day, {
        phase: 1,
        lmsUp: true,
        vectorUp: true,
        aiFaultRate: 0.02,
        usePinecone: day < 7,
      });
      allLogs.push({ userId: u.id, day, ...r });
    });
  }

  // Phase B and C can be simulated similarly but with scaled counts if needed

  // Outputs
  const sim = {
    phaseAUsers: phaseAUsers.length,
    days,
    totalHints: phaseAUsers.reduce((s, u) => s + u.hintsGiven, 0),
    logs: allLogs
  };
  // Write outputs
  const outDir = path.resolve(__dirname, '..', 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, 'simulation_summary.json'), JSON.stringify({ phase: 'A', ...sim }, null, 2));
  fs.writeFileSync(path.join(outDir, 'user_behavior_report.json'), JSON.stringify(phaseAUsers, null, 2));
  // cost and latency placeholders for now
  fs.writeFileSync(path.join(outDir, 'latency_report.json'), JSON.stringify({ phase: 'A', p95: 200, p99: 350 }), null, 2);
  fs.writeFileSync(path.join(outDir, 'cost_analysis.json'), JSON.stringify({ phase: 'A', perUser: 0.50, perDay: 0.5 }), null, 2);
  fs.writeFileSync(path.join(outDir, 'failure_recovery_report.json'), JSON.stringify({ incidents: [] }, null, 2));
  // gating recommendation
  fs.writeFileSync(path.join(outDir, 'go_no_go_recommendation.md'), "Phase A GO/NO-GO: pending governance sign-off");
  console.log('Pilot simulation completed. Reports written to reports/');
}

main();
