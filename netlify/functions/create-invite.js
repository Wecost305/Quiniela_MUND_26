const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { json } = require('./_common');

function randToken(bytes = 18) {
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parseCount(event) {
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }
  const raw = Number(body.count || body.quantity || 1);
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(500, Math.floor(raw)));
}

async function createOneInvite(store, origin) {
  const now = Date.now();
  let token = '';
  let userId = '';
  let inviteKey = '';

  for (let i = 0; i < 10; i++) {
    token = randToken(18);
    userId = 'u_' + randToken(10);
    inviteKey = `invites/${token}`;

    const existing = await store.get(inviteKey, { consistency: 'strong' });
    if (existing === null) break;
    token = '';
  }

  if (!token) throw new Error('No se pudo generar un token único.');

  await store.setJSON(inviteKey, {
    token,
    userId,
    createdAt: now,
    used: false
  });

  const inviteUrl = `${origin}/?invite=${encodeURIComponent(token)}`;
  return { token, userId, inviteUrl };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const adminKeyEnv = (process.env.ADMIN_KEY || '').trim().normalize('NFKC');
  const adminKey = String(event.headers['x-admin-key'] || event.headers['X-Admin-Key'] || '')
    .trim()
    .normalize('NFKC');

  if (!adminKeyEnv || adminKey !== adminKeyEnv) {
    return json(401, { error: 'No autorizado.' });
  }

  try {
    if (typeof connectLambda === 'function') connectLambda(event);
    const store = getStore({ name: 'qm2026', consistency: 'strong' });

    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host || process.env.URL?.replace(/^https?:\/\//,'') || '';
    const origin = process.env.URL || `${proto}://${host}`;
    const count = parseCount(event);

    const invitations = [];
    for (let i = 0; i < count; i++) {
      invitations.push(await createOneInvite(store, origin));
    }

    return json(200, {
      count: invitations.length,
      invitations,
      // Compatibilidad con el panel anterior cuando solo se crea una invitación
      token: invitations[0]?.token,
      userId: invitations[0]?.userId,
      inviteUrl: invitations[0]?.inviteUrl
    });
  } catch (e) {
    return json(500, { error: 'Error interno al crear invitación.', detail: String(e && e.message ? e.message : e) });
  }
};
