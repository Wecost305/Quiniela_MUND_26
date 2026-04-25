const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { json } = require('./_common');

const TOKEN_PREFIX = 'M26';
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

function getInviteSecret() {
  return String(process.env.INVITE_SECRET || process.env.ADMIN_KEY || '')
    .trim()
    .normalize('NFKC');
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

  if (bits > 0) {
    output += TOKEN_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function macForCode(code, secret) {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`${TOKEN_PREFIX}:${code}`)
    .digest();

  return toBase32(digest).slice(0, 5);
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
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
    used: false,
    stateless: true,
    tokenFormat: 'short-v3'
  };
}

function base64UrlToString(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function signPayload(payloadB64, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parseSignedInviteToken(token) {
  const value = String(token || '').trim();
  if (!value.startsWith('v2.')) return null;

  const parts = value.split('.');
  if (parts.length !== 3) return null;

  const [, payloadB64, signature] = parts;
  const secret = getInviteSecret();
  if (!secret) throw new Error('Falta configurar ADMIN_KEY o INVITE_SECRET en Netlify.');

  const expected = signPayload(payloadB64, secret);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlToString(payloadB64));
    if (!payload || payload.v !== 2 || !payload.userId) return null;

    return {
      token: value,
      userId: String(payload.userId),
      createdAt: Number(payload.createdAt || Date.now()),
      used: false,
      stateless: true,
      tokenFormat: 'signed-v2'
    };
  } catch (e) {
    return null;
  }
}

function getBlobStore(event) {
  if (typeof connectLambda === 'function') connectLambda(event);
  return getStore({ name: 'qm2026', consistency: 'strong' });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }

  const rawToken = String(body.token || '').trim();
  const shortToken = normalizeShortToken(rawToken);
  const token = shortToken || rawToken;
  const deviceId = String(body.deviceId || '').trim();

  if (!token) return json(400, { error: 'Token requerido.' });
  if (!deviceId) return json(400, { error: 'DeviceId requerido.' });

  try {
    const store = getBlobStore(event);
    const now = Date.now();
    const deviceHash = sha256Hex(deviceId);
    const tokenHash = sha256Hex(token);

    // 1) Compatibilidad con tokens anteriores guardados como invites/{token}.
    let inviteKey = `invites/${rawToken}`;
    let invite = await store.get(inviteKey, { type: 'json', consistency: 'strong' });

    if (!invite && shortToken && shortToken !== rawToken) {
      inviteKey = `invites/${shortToken}`;
      invite = await store.get(inviteKey, { type: 'json', consistency: 'strong' });
    }

    let isStatelessInvite = false;

    // 2) Tokens largos v2 creados por la versión anterior.
    if (!invite) {
      invite = parseSignedInviteToken(rawToken);
      isStatelessInvite = !!invite;
    }

    // 3) Tokens cortos nuevos: M26-XXXXXX-XXXXX.
    if (!invite) {
      invite = parseShortInviteToken(rawToken);
      isStatelessInvite = !!invite;
    }

    if (!invite) return json(404, { error: 'Token inválido. Revisa que esté completo y vuelve a intentarlo.' });

    if (isStatelessInvite) {
      inviteKey = `redeemed-invites/${sha256Hex(invite.token || token)}`;
      const redeemed = await store.get(inviteKey, { type: 'json', consistency: 'strong' });
      if (redeemed) return json(409, { error: 'Este token ya fue utilizado. Solicita uno nuevo.' });
    } else if (invite.used) {
      return json(409, { error: 'Este token ya fue utilizado. Solicita uno nuevo.' });
    }

    const sessionId = 's_' + randToken(18);

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

    return json(200, { sessionId, userId: invite.userId });
  } catch (e) {
    return json(500, {
      error: 'Error interno al canjear token.',
      detail: String(e && e.message ? e.message : e)
    });
  }
};
