const crypto = require('crypto');
const { json } = require('./_common');

const TOKEN_PREFIX = 'M26';
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SESSION_PREFIX = 'st3';

function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s || '')).digest('hex');
}

function randToken(bytes = 18) {
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
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

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToString(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function signValue(value, secret, scope = 'invite') {
  return crypto
    .createHmac('sha256', secret)
    .update(`${scope}:${value}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function toBase32(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += TOKEN_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) output += TOKEN_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function macForCode(code, secret) {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`${TOKEN_PREFIX}:${code}`)
    .digest();

  return toBase32(digest).slice(0, 5);
}

function normalizeShortToken(raw) {
  const compact = String(raw || '')
    .trim()
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[—–−]/g, '-')
    .replace(/[^A-Z0-9]/g, '');

  const expectedLength = TOKEN_PREFIX.length + 6 + 5;
  if (!compact.startsWith(TOKEN_PREFIX) || compact.length !== expectedLength) return null;

  const code = compact.slice(TOKEN_PREFIX.length, TOKEN_PREFIX.length + 6);
  const mac = compact.slice(TOKEN_PREFIX.length + 6);
  const allowed = new RegExp(`^[${TOKEN_ALPHABET}]+$`);

  if (!allowed.test(code) || !allowed.test(mac)) return null;

  return `${TOKEN_PREFIX}-${code}-${mac}`;
}

function parseShortInviteToken(rawToken) {
  const secret = getInviteSecret();
  if (!secret) throw new Error('Falta configurar ADMIN_KEY o INVITE_SECRET en Netlify.');

  const token = normalizeShortToken(rawToken);
  if (!token) return null;

  const [, code, mac] = token.split('-');
  const expected = macForCode(code, secret);
  if (!safeEqual(mac, expected)) return null;

  return {
    token,
    userId: 'u_' + sha256Hex(token).slice(0, 12),
    createdAt: Date.now(),
    tokenFormat: 'short-v3'
  };
}

function parseSignedInviteToken(rawToken) {
  const value = String(rawToken || '').trim();
  if (!value.startsWith('v2.')) return null;

  const parts = value.split('.');
  if (parts.length !== 3) return null;

  const [, payloadB64, signature] = parts;
  const secret = getInviteSecret();
  if (!secret) throw new Error('Falta configurar ADMIN_KEY o INVITE_SECRET en Netlify.');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlToString(payloadB64));
    if (!payload || payload.v !== 2 || !payload.userId) return null;

    return {
      token: value,
      userId: String(payload.userId),
      createdAt: Number(payload.createdAt || Date.now()),
      tokenFormat: 'signed-v2'
    };
  } catch (e) {
    return null;
  }
}

function createSignedSession(invite, deviceId) {
  const secret = getInviteSecret();
  if (!secret) throw new Error('Falta configurar ADMIN_KEY o INVITE_SECRET en Netlify.');

  const now = Date.now();
  const payload = {
    v: 3,
    sid: 's_' + randToken(18),
    userId: invite.userId,
    deviceHash: sha256Hex(deviceId),
    tokenHash: sha256Hex(invite.token),
    createdAt: now,
    lastSeenAt: now
  };

  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signature = signValue(payloadB64, secret, 'session');
  return `${SESSION_PREFIX}.${payloadB64}.${signature}`;
}

async function tryRedeemLegacyBlobToken(rawToken, deviceId) {
  // Solo se usa para compatibilidad con tokens viejos guardados en Blobs.
  // Si Blobs no está disponible, no bloquea los tokens cortos nuevos.
  let blobs;
  try {
    blobs = require('@netlify/blobs');
  } catch (e) {
    return null;
  }

  const { getStore, connectLambda } = blobs;
  if (typeof getStore !== 'function') return null;

  if (typeof connectLambda === 'function') connectLambda(global.__QM2026_EVENT__);
  const store = getStore({ name: 'qm2026', consistency: 'strong' });

  const inviteKey = `invites/${rawToken}`;
  const invite = await store.get(inviteKey, { type: 'json', consistency: 'strong' });
  if (!invite) return null;
  if (invite.used) return { error: json(409, { error: 'Este token ya fue utilizado. Solicita uno nuevo.' }) };

  const now = Date.now();
  const sessionId = 's_' + randToken(18);
  const deviceHash = sha256Hex(deviceId);

  await store.setJSON(inviteKey, {
    ...invite,
    used: true,
    usedAt: now,
    deviceHash,
    sessionId
  });

  await store.setJSON(`sessions/${sessionId}`, {
    sessionId,
    userId: invite.userId,
    deviceHash,
    createdAt: now,
    lastSeenAt: now
  });

  await store.setJSON(`users/${invite.userId}`, {
    userId: invite.userId,
    createdAt: invite.createdAt || now,
    activatedAt: now,
    status: 'active'
  });

  return { sessionId, userId: invite.userId };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  global.__QM2026_EVENT__ = event;

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }

  const rawToken = String(body.token || '').trim();
  const deviceId = String(body.deviceId || '').trim();

  if (!rawToken) return json(400, { error: 'Token requerido.' });
  if (!deviceId) return json(400, { error: 'DeviceId requerido.' });

  try {
    const invite = parseShortInviteToken(rawToken) || parseSignedInviteToken(rawToken);

    if (invite) {
      const sessionId = createSignedSession(invite, deviceId);
      return json(200, { sessionId, userId: invite.userId });
    }

    const legacy = await tryRedeemLegacyBlobToken(rawToken, deviceId);
    if (legacy && legacy.error) return legacy.error;
    if (legacy) return json(200, legacy);

    return json(404, { error: 'Token inválido. Revisa que esté completo y vuelve a intentarlo.' });
  } catch (e) {
    return json(500, {
      error: 'Error interno al canjear token.',
      detail: String(e && e.message ? e.message : e)
    });
  }
};
