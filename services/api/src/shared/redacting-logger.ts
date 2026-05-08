import { ConsoleLogger } from '@nestjs/common';
import { redactValue, type RedactionOptions } from './redaction';

export class RedactingLogger extends ConsoleLogger {
  constructor(context = 'UDB-API', private readonly redaction: RedactionOptions = {}) {
    super(context, { timestamp: true });
  }

  private sanitize(message: unknown): unknown {
    if (typeof message === 'string') return message;
    return redactValue(message, this.redaction);
  }

  override log(message: unknown, context?: string) {
    super.log(this.sanitize(message), context);
  }

  override error(message: unknown, stack?: string, context?: string) {
    super.error(this.sanitize(message), stack, context);
  }

  override warn(message: unknown, context?: string) {
    super.warn(this.sanitize(message), context);
  }

  override debug(message: unknown, context?: string) {
    super.debug(this.sanitize(message), context);
  }

  override verbose(message: unknown, context?: string) {
    super.verbose(this.sanitize(message), context);
  }
}

