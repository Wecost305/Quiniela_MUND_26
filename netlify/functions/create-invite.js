const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { json } = require('./_common');

/**
 * Create a Blobs store that works in BOTH:
 * - Lambda compatibility runtime (needs connectLambda(event))
 * - Manual configuration (siteID + token) via env vars
 */
function getConfiguredStore(event) {
  // Try to configure Blobs automatically for Lambda compatibility
  try { connectLambda(event); } catch (e) { /* ignore */ }

  const siteID = (process.env.BLOBS_SITE_ID || '').trim();
  const token = (process.env.BLOBS_TOKEN || '').trim();

  const opts = { name: 'qm2026' };
  if (siteID && token) {
    opts.siteID = siteID;
    opts.token = token;
  }
  return getStore(opts);
}

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
  const headerKey = event.headers?.['x-admin-key'] || event.headers?.['X-Admin-Key'] || '';
  const adminKey = String(headerKey).trim().normalize('NFKC');

  if (!adminKeyEnv || adminKey !== adminKeyEnv) {
    return json(401, { error: 'No autorizado.' });
  }

  // Helpful config checks (so errors are explicit, not "misterious 500")
  const siteID = (process.env.BLOBS_SITE_ID || '').trim();
  const token = (process.env.BLOBS_TOKEN || '').trim();
  if (!siteID || !token) {
    return json(500, {
      error: 'Faltan variables de entorno para Blobs.',
      detail: 'Configura BLOBS_SITE_ID y BLOBS_TOKEN en Netlify (Environment variables).'
    });
  }

  try {
    const store = getConfiguredStore(event);

    const now = Date.now();
    let tokenStr = '';
    let userId = '';

    // Generate a unique token (best-effort)
    for (let i = 0; i < 10; i++) {
      tokenStr = randToken(18);
      userId = 'u_' + randToken(10);

      const existing = await store.get(`invites/${tokenStr}`);
      if (existing === null) break;
      tokenStr = '';
    }

    if (!tokenStr) {
      return json(500, { error: 'No se pudo generar un token único. Intenta de nuevo.' });
    }

    await store.setJSON(`invites/${tokenStr}`, {
      token: tokenStr,
      userId,
      createdAt: now,
      used: false
    });

    const origin = event.headers?.origin || `https://${event.headers?.host}`;
    const inviteUrl = `${origin}/?invite=${encodeURIComponent(tokenStr)}`;

    return json(200, { token: tokenStr, userId, inviteUrl });
  } catch (e) {
    return json(500, { error: 'Error interno al crear invitación.', detail: String(e?.message || e) });
  }
};
