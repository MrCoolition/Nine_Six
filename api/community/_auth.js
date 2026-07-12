import { createRemoteJWKSet, jwtVerify } from 'jose';

let cachedIssuer = '';
let cachedJwks = null;

export async function requireAuth0Subject(request) {
  const issuer = normalizeIssuer(process.env.AUTH0_ISSUER_BASE_URL);
  const audience = String(process.env.AUTH0_AUDIENCE || '').trim();
  if (!issuer || !audience) {
    throw httpError(503, 'Party authentication is not configured.');
  }

  const authorization = String(request.headers?.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw httpError(401, 'Authentication required.');

  if (!cachedJwks || cachedIssuer !== issuer) {
    cachedIssuer = issuer;
    cachedJwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
  }

  try {
    const { payload } = await jwtVerify(match[1], cachedJwks, {
      issuer,
      audience,
      algorithms: ['RS256']
    });
    if (!payload.sub) throw new Error('Token has no subject.');
    return String(payload.sub);
  } catch {
    throw httpError(401, 'Invalid or expired session.');
  }
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeIssuer(value) {
  const issuer = String(value || '').trim();
  return issuer ? `${issuer.replace(/\/+$/, '')}/` : '';
}
