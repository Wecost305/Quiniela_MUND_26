const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');
const { json } = require('./_common');

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
    const store = getStore({ name: 'qm2026', consistency: 'strong' });

    const session = await store.get(`sessions/${sessionId}`, { type: 'json', consistency: 'strong' });
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
