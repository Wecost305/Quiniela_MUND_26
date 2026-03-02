const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');
const { json } = require('./_common');

function randToken(bytes = 18) {
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
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
    const store = getStore({ name: 'qm2026', consistency: 'strong' });

    const now = Date.now();
    let token = '';
    let userId = '';
    let inviteKey = '';

    // generar token único (muy baja probabilidad de colisión, pero validamos)
    for (let i = 0; i < 10; i++) {
      token = randToken(18);
      userId = 'u_' + randToken(10);
      inviteKey = `invites/${token}`;

      const existing = await store.get(inviteKey, { consistency: 'strong' });
      if (existing === null) break;
      token = '';
    }

    if (!token) {
      return json(500, { error: 'No se pudo generar un token único. Intenta de nuevo.' });
    }

    await store.setJSON(inviteKey, {
      token,
      userId,
      createdAt: now,
      used: false
    });

    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host || process.env.URL?.replace(/^https?:\/\//,'') || '';
    const origin = process.env.URL || `${proto}://${host}`;
    const inviteUrl = `${origin}/?invite=${encodeURIComponent(token)}`;

    return json(200, { token, userId, inviteUrl });
  } catch (e) {
    return json(500, { error: 'Error interno al crear invitación.', detail: String(e && e.message ? e.message : e) });
  }
};
