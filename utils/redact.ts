const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'accesstoken',
  'refreshtoken',
  'ssn',
  'cardnumber',
  'iban',
]);

const MASK = '[OCULTO]';

const isSensitive = (key: string): boolean => SENSITIVE_KEYS.has(key.toLowerCase());

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.name === 'string' && 'value' in record && isSensitive(record.name)) {
    return { ...record, value: MASK };
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, isSensitive(key) ? MASK : redact(entry)]),
  );
}
