const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { json } = require('./_common');

function openQmStore(event) {
  const siteID = String(process.env.BLOBS_SITE_ID || '').trim();
  const token = String(process.env.BLOBS_TOKEN || '').trim();
  // Si por alguna razón Netlify no inyecta el contexto de Blobs, usamos configuración manual.
  // (siteID = Project ID del sitio; token = Personal Access Token).
  if (siteID && token) {
    return getStore('qm2026', { siteID, token });
  }
  // Modo normal (cero-config): en Lambda compatibility hay que inicializar con connectLambda(event)
  connectLambda(event);
  return getStore('qm2026');
}


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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    body = {};
  }

  const token = String(body.token || '').trim();
  const deviceId = String(body.deviceId || '').trim();

  if (!token) return json(400, { error: 'Token requerido.' });
  if (!deviceId) return json(400, { error: 'DeviceId requerido.' });

  try {
    const store = openQmStore(event);


    const inviteKey = `invites/${token}`;
    const invite = await store.get(inviteKey, { type: 'json' });

    if (!invite) return json(404, { error: 'Token inválido.' });
    if (invite.used) return json(409, { error: 'Este token ya fue utilizado. Solicita uno nuevo.' });

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

    return json(200, { sessionId, userId: invite.userId });
  } catch (e) {
    return json(500, { error: 'Error interno al canjear token.', detail: String(e && e.message ? e.message : e) });
  }
};