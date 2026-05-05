import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { createHash } from 'crypto';

const LEDGER_DIR = './audit';
const LEDGER_PATH = `${LEDGER_DIR}/immutable_ledger.log`;
const LAST_HASH_PATH = `${LEDGER_DIR}/last_hash.txt`;

function ensureLedger() {
  if (!existsSync(LEDGER_DIR)) mkdirSync(LEDGER_DIR);
  if (!existsSync(LEDGER_PATH)) appendFileSync(LEDGER_PATH, '');
  if (!existsSync(LAST_HASH_PATH)) appendFileSync(LAST_HASH_PATH, '');
}

function readLastHash(): string {
  try {
    const s = readFileSync(LAST_HASH_PATH, 'utf8').trim();
    return s || '';
  } catch {
    return '';
  }
}

export class AuditLedger {
  constructor() { ensureLedger(); }

  logEvent(payload: any) {
    const lastHash = readLastHash();
    const line = JSON.stringify(payload);
    const hash = createHash('sha256').update(line + lastHash).digest('hex');
    const entry = JSON.stringify({ line, hash, prevHash: lastHash });
    // Append as a line to ledger file for immutability audit trail
    appendFileSync(LEDGER_PATH, entry + '\n');
    // Persist last hash for next entry
    require('fs').writeFileSync(LAST_HASH_PATH, hash, 'utf8');
    return { hash, entry: payload };
  }

  readAll() {
    try {
      const content = readFileSync(LEDGER_PATH, 'utf8');
      return content.split('\n').filter(Boolean).map((l) => JSON.parse(l));
    } catch {
      return [];
    }
  }
}
