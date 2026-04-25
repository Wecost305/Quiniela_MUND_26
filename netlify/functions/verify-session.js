const crypto = require('crypto');
const { json } = require('./_common');

const SESSION_PREFIX = 'st3';

function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s || '')).digest('hex');
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function getInviteSecret() {
  return String(process.env.INVITE_SECRET || process.env.ADMIN_KEY || '')
    .trim()
    .normalize('NFKC');
}

function base64UrlToString(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function signValue(value, secret, scope = 'session') {
  return crypto
    .createHmac('sha256', secret)
    .update(`${scope}:${value}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function verifySignedSession(sessionId, deviceId) {
  const value = String(sessionId || '').trim();
  if (!value.startsWith(`${SESSION_PREFIX}.`)) return null;

  const parts = value.split('.');
  if (parts.length !== 3) return null;

  const [, payloadB64, signature] = parts;
  const secret = getInviteSecret();
  if (!secret) throw new Error('Falta configurar ADMIN_KEY o INVITE_SECRET en Netlify.');

  const expected = signValue(payloadB64, secret, 'session');
  if (!safeEqual(signature, expected)) return { error: json(401, { error: 'Sesión inválida. Vuelve a activar tu acceso.' }) };

  let payload;
  try {
    payload = JSON.parse(base64UrlToString(payloadB64));
  } catch (e) {
    return { error: json(401, { error: 'Sesión inválida. Vuelve a activar tu acceso.' }) };
  }

  if (!payload || payload.v !== 3 || !payload.userId || !payload.deviceHash) {
    return { error: json(401, { error: 'Sesión inválida. Vuelve a activar tu acceso.' }) };
  }

  const deviceHash = sha256Hex(deviceId);
  if (!safeEqual(payload.deviceHash, deviceHash)) {
    return { error: json(403, { error: 'Esta sesión pertenece a otro dispositivo.' }) };
  }

  return { ok: true, userId: String(payload.userId) };
}

async function tryVerifyLegacyBlobSession(event, sessionId, deviceId) {
  let blobs;
  try {
    blobs = require('@netlify/blobs');
  } catch (e) {
    return null;
  }

  const { getStore, connectLambda } = blobs;
  if (typeof getStore !== 'function') return null;
  if (typeof connectLambda === 'function') connectLambda(event);

  const store = getStore({ name: 'qm2026', consistency: 'strong' });
  const session = await store.get(`sessions/${sessionId}`, { type: 'json', consistency: 'strong' });
  if (!session) return { error: json(401, { error: 'Sesión inválida. Vuelve a activar tu acceso.' }) };

  const deviceHash = sha256Hex(deviceId);
  if (session.deviceHash !== deviceHash) {
    return { error: json(403, { error: 'Esta sesión pertenece a otro dispositivo.' }) };
  }

  await store.setJSON(`sessions/${sessionId}`, { ...session, lastSeenAt: Date.now() });
  return { ok: true, userId: session.userId };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }

  const sessionId = String(body.sessionId || '').trim();
  const deviceId = String(body.deviceId || '').trim();

  if (!sessionId) return json(400, { error: 'sessionId requerido.' });
  if (!deviceId) return json(400, { error: 'deviceId requerido.' });

  try {
    const signed = verifySignedSession(sessionId, deviceId);
    if (signed && signed.error) return signed.error;
    if (signed) return json(200, signed);

    const legacy = await tryVerifyLegacyBlobSession(event, sessionId, deviceId);
    if (legacy && legacy.error) return legacy.error;
    if (legacy) return json(200, legacy);

    return json(401, { error: 'Sesión inválida. Vuelve a activar tu acceso.' });
  } catch (e) {
    return json(500, {
      error: 'Error interno al validar sesión.',
      detail: String(e && e.message ? e.message : e)
    });
  }
};
