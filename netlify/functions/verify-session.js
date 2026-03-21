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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    body = {};
  }

  const sessionId = String(body.sessionId || '').trim();
  const deviceId = String(body.deviceId || '').trim();

  if (!sessionId) return json(400, { error: 'sessionId requerido.' });
  if (!deviceId) return json(400, { error: 'deviceId requerido.' });

  try {
    const store = openQmStore(event);


    const session = await store.get(`sessions/${sessionId}`, { type: 'json' });
    if (!session) return json(401, { error: 'Sesión inválida. Vuelve a activar tu acceso.' });

    const deviceHash = sha256Hex(deviceId);
    if (session.deviceHash !== deviceHash) {
      return json(403, { error: 'Esta sesión pertenece a otro dispositivo.' });
    }

    const now = Date.now();
    await store.setJSON(`sessions/${sessionId}`, { ...session, lastSeenAt: now });

    return json(200, { ok: true, userId: session.userId });
  } catch (e) {
    return json(500, { error: 'Error interno al validar sesión.', detail: String(e && e.message ? e.message : e) });
  }
};