/**
 * Autenticación OAuth2 para Google Cloud / Firebase Service Account
 * Genera tokens de acceso firmados con RS256 mediante Web Crypto API nativo.
 * Cachea el token en memoria para respetar el límite de ~10ms de CPU de Cloudflare Workers Free.
 */

let cachedAccessToken = null;
let tokenExpiresAt = 0; // Timestamp en ms

/**
 * Convierte ArrayBuffer a Base64URL string.
 */
function bufferToBase64Url(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convierte string PEM de clave privada a CryptoKey.
 */
async function importPrivateKey(pem) {
  const cleanPem = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  const binaryDer = atob(cleanPem);
  const bytes = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    bytes[i] = binaryDer.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  );
}

/**
 * Obtiene un token de acceso OAuth2 válido para Firestore.
 * Reutiliza el token cacheado si aún no expira.
 */
export async function getGoogleAccessToken(env) {
  const now = Date.now();
  if (cachedAccessToken && tokenExpiresAt > now + 60000) {
    return cachedAccessToken;
  }

  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKeyPem = env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKeyPem) {
    throw new Error('Credenciales de Service Account no configuradas en secretos del Worker.');
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600; // 1 hora de validez

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp,
    scope: 'https://www.googleapis.com/auth/datastore'
  };

  const encHeader = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encHeader}.${encPayload}`;

  const privateKey = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const jwt = `${unsignedToken}.${bufferToBase64Url(signature)}`;

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Error obteniendo token OAuth2 de Google: ${errText}`);
  }

  const tokenData = await tokenResp.json();
  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = now + (tokenData.expires_in * 1000) - 120000; // Renovar 2 min antes

  return cachedAccessToken;
}
