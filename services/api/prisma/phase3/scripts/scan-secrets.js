const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', 'dist', '.turbo', 'coverage']);
const SECRET_PATTERNS = [
  { regex: /(?:(?:sk_live|sk_test|pk_live|pk_test|whsec)_[a-zA-Z0-9]+)/g, name: 'Stripe key' },
  { regex: /(?:ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9_]{36,}/g, name: 'GitHub token' },
  { regex: /(?:AKIA[0-9A-Z]{16})/g, name: 'AWS access key' },
  { regex: /(?:-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/g, name: 'Private key' },
  { regex: /(?:xox[baprs]-[0-9a-zA-Z-]{10,})/g, name: 'Slack token' },
  { regex: /(?:SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43})/g, name: 'SendGrid key' },
  { regex: /password\s*[:=]\s*['\"][^'\"]+['\"]/gi, name: 'Hardcoded password' },
  { regex: /secret\s*[:=]\s*['\"][^'\"]{8,}['\"]/gi, name: 'Hardcoded secret' },
];

let findings = [];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of SECRET_PATTERNS) {
      const matches = content.match(pattern.regex);
      if (matches) {
        findings.push({ file: filePath, pattern: pattern.name, count: matches.length, sample: matches[0].slice(0, 20) + '...' });
      }
    }
  } catch (e) {
    // Skip binary/unreadable files
  }
}

function walkDir(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) walkDir(fullPath);
      } else if (entry.isFile() && !entry.name.startsWith('.')) {
        if (/\.(js|ts|json|yml|yaml|env|conf|ini|sh|ps1|bat|cmd|md|txt|example)$/i.test(entry.name)) {
          scanFile(fullPath);
        }
      }
    }
  } catch (e) {
    // Permission denied, skip
  }
}

walkDir(ROOT);

const result = {
  scanDate: new Date().toISOString(),
  totalFilesScanned: findings.length,
  secretsFound: findings.length,
  findings,
  passed: findings.length === 0,
};

console.log(JSON.stringify(result, null, 2));
if (findings.length > 0) {
  console.warn(`WARNING: ${findings.length} potential secrets found!`);
  process.exit(1);
} else {
  console.log('OK: No secrets detected in scanned files.');
}
