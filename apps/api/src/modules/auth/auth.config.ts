const DEV_FALLBACK_SECRET = 'dev-insecure-jwt-secret-change-me-1234567890';
const MIN_SECRET_LENGTH = 32;

function assertStrongSecret(secret: string, label: string) {
  if (secret.trim().length < MIN_SECRET_LENGTH) {
    throw new Error(`${label} debe tener al menos ${MIN_SECRET_LENGTH} caracteres`);
  }
}

export function getJwtSigningSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (secret) {
    assertStrongSecret(secret, 'JWT_SECRET');
    return secret;
  }

  if (isProd) {
    throw new Error(
      `JWT_SECRET no configurado. En produccion debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`
    );
  }

  return DEV_FALLBACK_SECRET;
}

export function getJwtVerificationSecrets(): string[] {
  const signingSecret = getJwtSigningSecret();
  const previous = (process.env.JWT_PREVIOUS_SECRETS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    for (const secret of previous) {
      assertStrongSecret(secret, 'JWT_PREVIOUS_SECRETS');
    }
  }

  return [signingSecret, ...previous];
}
