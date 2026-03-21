const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { json } = require('./_common');

function getConfiguredStore(event) {
  try { connectLambda(event); } catch (e) { /* ignore */ }

  const siteID = (process.env.BLOBS_SITE_ID || '').trim();
  const token = (process.env.BLOBS_TOKEN || '').trim();

  const opts = { name: 'qm2026' };
  // Si tenemos credenciales, forzamos modo manual (más estable)
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
    // Compat: front antiguo manda { token }, versión nueva manda { invite }
    const inviteToken = String(body.token || body.invite || body.inviteToken || '').trim();
    const deviceId = String(body.deviceId || '').trim();

    if (!inviteToken) return json(400, { error: 'Falta invite token.' });
    if (!deviceId) return json(400, { error: 'Falta deviceId.' });

    const inviteKey = `invites/${inviteToken}`;
    const invite = await store.getJSON(inviteKey);

    if (!invite) return json(404, { error: 'Token inválido.' });
    if (invite.used) return json(409, { error: 'Este token ya fue utilizado. Solicita uno nuevo.' });

    // Marcar invite como usado y vincular al dispositivo
    invite.used = true;
    invite.usedAt = Date.now();
    invite.deviceId = deviceId;

    await store.setJSON(inviteKey, invite);

    // Crear sesión compatible con front (sessionId)
    const sessionId = 's_' + randToken(18);
    await store.setJSON(`sessions/${sessionId}`, {
      sessionId,
      userId: invite.userId,
      deviceId,
      createdAt: Date.now(),
      lastSeenAt: Date.now()
    });

    return json(200, {
      sessionId,
      userId: invite.userId,
      // Compat opcional por si algún front nuevo lee sessionToken
      sessionToken: sessionId
    });
  } catch (e) {
    return json(500, { error: 'Error interno al canjear invitación.', detail: String(e?.message || e) });
  }
};
