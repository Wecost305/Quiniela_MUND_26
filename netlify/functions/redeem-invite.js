const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { json } = require('./_common');

function getConfiguredStore(event) {
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

  const siteID = (process.env.BLOBS_SITE_ID || '').trim();
  const tokenEnv = (process.env.BLOBS_TOKEN || '').trim();
  if (!siteID || !tokenEnv) {
    return json(500, {
      error: 'Faltan variables de entorno para Blobs.',
      detail: 'Configura BLOBS_SITE_ID y BLOBS_TOKEN en Netlify (Environment variables).'
    });
  }

  try {
    const store = getConfiguredStore(event);

    const body = JSON.parse(event.body || '{}');
    const inviteToken = String(body.invite || '').trim();
    const deviceId = String(body.deviceId || '').trim();

    if (!inviteToken) return json(400, { error: 'Falta invite token.' });
    if (!deviceId) return json(400, { error: 'Falta deviceId.' });

    const inviteKey = `invites/${inviteToken}`;
    const invite = await store.getJSON(inviteKey);

    if (!invite) return json(404, { error: 'Invitación no encontrada.' });
    if (invite.used) return json(409, { error: 'Invitación ya utilizada.' });

    // Mark invite as used and bind to device
    invite.used = true;
    invite.usedAt = Date.now();
    invite.deviceId = deviceId;

    await store.setJSON(inviteKey, invite);

    // Create a session token tied to user + device
    const sessionToken = randToken(24);
    await store.setJSON(`sessions/${sessionToken}`, {
      sessionToken,
      userId: invite.userId,
      deviceId,
      createdAt: Date.now()
    });

    return json(200, {
      sessionToken,
      userId: invite.userId
    });
  } catch (e) {
    return json(500, { error: 'Error interno al canjear invitación.', detail: String(e?.message || e) });
  }
};
