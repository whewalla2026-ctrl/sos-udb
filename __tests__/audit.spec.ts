import { AuditService } from '../services/audit/audit.service';
import { AuditLedger } from '../audit-ledger/audit-ledger';

describe('Audit Ledger - durability', () => {
  it('logs an event and writes to immutable ledger', () => {
    const audit = new AuditService();
    const log = audit.logEvent('user-1', 'TEST_EVENT', { foo: 'bar' });
    expect(log).toHaveProperty('ledgerHash');
  });
});
