const DEFAULT_REDACT_KEY_PATTERNS: RegExp[] = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /email/i,
];

export type RedactionOptions = {
  redactKeyPatterns?: RegExp[];
  maxDepth?: number;
  replacement?: string;
};

export function redactValue<T>(
  input: T,
  { redactKeyPatterns = DEFAULT_REDACT_KEY_PATTERNS, maxDepth = 6, replacement = '[REDACTED]' }: RedactionOptions = {},
): T {
  const seen = new WeakMap<object, unknown>();

  const shouldRedactKey = (key: string) => redactKeyPatterns.some((re) => re.test(key));

  const walk = (value: unknown, depth: number): unknown => {
    if (depth > maxDepth) return '[TRUNCATED]';

    if (value === null) return value;
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint' || t === 'undefined') return value;

    if (value instanceof Date) return value.toISOString();
    if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
    if (Array.isArray(value)) return value.map((v) => walk(v, depth + 1));

    if (t === 'object') {
      const obj = value as Record<string, unknown>;
      if (seen.has(obj)) return seen.get(obj);

      const out: Record<string, unknown> = {};
      seen.set(obj, out);

      for (const [k, v] of Object.entries(obj)) {
        out[k] = shouldRedactKey(k) ? replacement : walk(v, depth + 1);
      }
      return out;
    }

    // functions, symbols, etc
    return String(value);
  };

  return walk(input, 0) as T;
}

