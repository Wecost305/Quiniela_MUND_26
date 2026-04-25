const crypto = require('crypto');
const { json } = require('./_common');

const TOKEN_PREFIX = 'M26';
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I/O/1/0 para evitar confusiones

function getHeader(event, name) {
  const headers = event.headers || {};
  const target = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === target) return value;
  }
  return '';
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

function randomCode(length = 6) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += TOKEN_ALPHABET[crypto.randomInt(0, TOKEN_ALPHABET.length)];
  }
  return out;
}

function macForCode(code, secret) {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`${TOKEN_PREFIX}:${code}`)
    .digest();

  return toBase32(digest).slice(0, 5);
}

function createShortInviteToken() {
  const secret = getInviteSecret();
  if (!secret) throw new Error('Falta configurar ADMIN_KEY o INVITE_SECRET en Netlify.');

  const code = randomCode(6);
  const mac = macForCode(code, secret);
  const token = `${TOKEN_PREFIX}-${code}-${mac}`;
  const userId = 'u_' + crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);

  return { token, userId };
}

function parseCount(event) {
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }

  const raw = Number(body.count || body.quantity || 1);
  if (!Number.isFinite(raw)) return 1;

  return Math.max(1, Math.min(500, Math.floor(raw)));
}

function getSiteUrl(event) {
  const explicit = String(process.env.PUBLIC_SITE_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/g, '') + '/';

  const netlifyUrl = String(process.env.URL || '').trim();
  if (netlifyUrl) return netlifyUrl.replace(/\/+$/g, '') + '/';

  const proto = getHeader(event, 'x-forwarded-proto') || 'https';
  const host = getHeader(event, 'host');
  return `${proto}://${host}`.replace(/\/+$/g, '') + '/';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return json(200, {
      ok: true,
      message: 'Function activa. Para crear tokens usa el panel admin con método POST.'
    });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const adminKeyEnv = String(process.env.ADMIN_KEY || '').trim().normalize('NFKC');
  const adminKey = String(getHeader(event, 'x-admin-key') || '').trim().normalize('NFKC');

  if (!adminKeyEnv || adminKey !== adminKeyEnv) {
    return json(401, { error: 'No autorizado.' });
  }

  try {
    const siteUrl = getSiteUrl(event);
    const count = parseCount(event);
    const invitations = [];

    for (let i = 0; i < count; i++) {
      const invite = createShortInviteToken();
      invitations.push({
        ...invite,
        siteUrl,
        inviteUrl: siteUrl,
        whatsappText: `Fixture Mundialista 2026: ${siteUrl} Token: ${invite.token}`
      });
    }

    return json(200, {
      count: invitations.length,
      siteUrl,
      invitations,
      token: invitations[0]?.token,
      userId: invitations[0]?.userId,
      inviteUrl: siteUrl,
      whatsappText: invitations[0]?.whatsappText
    });
  } catch (e) {
    return json(500, {
      error: 'Error interno al crear token.',
      detail: String(e && e.message ? e.message : e)
    });
  }
};
