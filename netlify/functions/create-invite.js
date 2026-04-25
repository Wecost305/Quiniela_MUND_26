const crypto = require('crypto');
const { json } = require('./_common');

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
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

function signPayload(payloadB64, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createSignedInviteToken() {
  const secret = getInviteSecret();
  if (!secret) throw new Error('Falta configurar ADMIN_KEY o INVITE_SECRET en Netlify.');

  const payload = {
    v: 2,
    userId: 'u_' + randToken(10),
    createdAt: Date.now(),
    nonce: randToken(16)
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadB64, secret);
  return {
    token: `v2.${payloadB64}.${signature}`,
    userId: payload.userId
  };
}

function parseCount(event) {
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }

  const raw = Number(body.count || body.quantity || 1);
  if (!Number.isFinite(raw)) return 1;

  // Mantener un límite sano para que el navegador no se congele renderizando demasiadas filas.
  return Math.max(1, Math.min(500, Math.floor(raw)));
}

function getOrigin(event) {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host || process.env.URL?.replace(/^https?:\/\//, '') || '';
  return process.env.URL || `${proto}://${host}`;
}

exports.handler = async (event) => {
  // Si alguien abre la ruta directamente en navegador, respondemos con una señal clara.
  if (event.httpMethod === 'GET') {
    return json(200, { ok: true, message: 'Function activa. Para crear invitaciones usa el panel admin con método POST.' });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const adminKeyEnv = (process.env.ADMIN_KEY || '').trim().normalize('NFKC');
  const adminKey = String(event.headers['x-admin-key'] || event.headers['X-Admin-Key'] || '')
    .trim()
    .normalize('NFKC');

  if (!adminKeyEnv || adminKey !== adminKeyEnv) {
    return json(401, { error: 'No autorizado.' });
  }

  try {
    const origin = getOrigin(event);
    const count = parseCount(event);
    const invitations = [];

    for (let i = 0; i < count; i++) {
      const invite = createSignedInviteToken();
      invitations.push({
        ...invite,
        inviteUrl: `${origin}/?invite=${encodeURIComponent(invite.token)}`
      });
    }

    return json(200, {
      count: invitations.length,
      invitations,
      // Compatibilidad con el panel anterior cuando solo se crea una invitación.
      token: invitations[0]?.token,
      userId: invitations[0]?.userId,
      inviteUrl: invitations[0]?.inviteUrl
    });
  } catch (e) {
    return json(500, {
      error: 'Error interno al crear invitación.',
      detail: String(e && e.message ? e.message : e)
    });
  }
};
