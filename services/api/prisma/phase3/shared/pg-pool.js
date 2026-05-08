const { PrismaClient } = require('@prisma/client');

const MAX_CONNECTIONS = parseInt(process.env.DB_POOL_MAX || '20');
const IDLE_TIMEOUT = parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000');
const CONNECT_TIMEOUT = parseInt(process.env.DB_POOL_CONNECT_TIMEOUT || '10000');

let prisma = null;
let poolMetrics = { active: 0, idle: 0, waiting: 0, totalConnections: 0, maxConnections: MAX_CONNECTIONS };

function getPrisma() {
  if (!prisma) {
    const url = new URL(process.env.DATABASE_URL || 'postgresql://udb:udb@localhost:5432/udb?schema=public');
    url.searchParams.set('connection_limit', MAX_CONNECTIONS.toString());
    url.searchParams.set('pool_timeout', CONNECT_TIMEOUT.toString());

    prisma = new PrismaClient({
      datasources: { db: { url: url.toString() } },
      log: process.env.LOG_LEVEL === 'DEBUG' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }
  return prisma;
}

async function checkPoolHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    poolMetrics.active = 0;
    poolMetrics.idle = MAX_CONNECTIONS;
    poolMetrics.waiting = 0;
    poolMetrics.totalConnections = MAX_CONNECTIONS;
    poolMetrics.status = 'healthy';
  } catch (err) {
    poolMetrics.status = 'degraded';
    poolMetrics.lastError = err.message;
  }
  return { ...poolMetrics };
}

function getPoolMetrics() {
  return { ...poolMetrics };
}

module.exports = { getPrisma, checkPoolHealth, getPoolMetrics };
