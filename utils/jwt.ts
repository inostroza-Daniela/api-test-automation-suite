export function decodeJwtPayload(token: string): unknown {
  const [, payload] = token.split('.');

  if (!payload) {
    throw new Error('El valor no es un JWT compacto: falta el segmento del payload');
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown;
}

export function withTamperedSignature(token: string): string {
  const separator = token.lastIndexOf('.');
  const signature = token.slice(separator + 1);
  const replacement = signature.startsWith('A') ? 'B' : 'A';

  return `${token.slice(0, separator + 1)}${replacement}${signature.slice(1)}`;
}
