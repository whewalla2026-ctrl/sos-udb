import { ConsoleLogger } from '@nestjs/common';
import { redactValue, type RedactionOptions } from './redaction';

export class RedactingLogger extends ConsoleLogger {
  constructor(context = 'UDB-API', private readonly redaction: RedactionOptions = {}) {
    super(context, { timestamp: false });
  }

  private sanitize(message: unknown): unknown {
    if (typeof message === 'string') return message;
    return redactValue(message, this.redaction);
  }

  private structuredLog(level: string, message: unknown, context?: string, stack?: string) {
    const entry: Record<string, any> = {
      level,
      message: this.sanitize(message),
      timestamp: new Date().toISOString(),
      service: 'nestjs-graphql',
      environment: process.env.NODE_ENV || 'development',
    };
    if (context) entry.context = context;
    if (stack) entry.stack = stack;
    if (typeof message === 'object' && message !== null) {
      const msg = message as Record<string, any>;
      if (msg.userId) entry.userId = msg.userId;
      if (msg.traceId) entry.traceId = msg.traceId;
      if (msg.duration) entry.duration = msg.duration;
    }
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  override log(message: unknown, context?: string) {
    this.structuredLog('info', message, context);
  }

  override error(message: unknown, stack?: string, context?: string) {
    this.structuredLog('error', message, context, stack);
    super.error(this.sanitize(message), stack, context);
  }

  override warn(message: unknown, context?: string) {
    this.structuredLog('warn', message, context);
    super.warn(this.sanitize(message), context);
  }

  override debug(message: unknown, context?: string) {
    this.structuredLog('debug', message, context);
  }

  override verbose(message: unknown, context?: string) {
    this.structuredLog('verbose', message, context);
  }
}

