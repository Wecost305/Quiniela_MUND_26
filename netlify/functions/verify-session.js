const { getStore, connectLambda } = require('@netlify/blobs');
const { json } = require('./_common');

function getConfiguredStore(event) {
  try { connectLambda(event); } catch (e) { /* ignore */ }

  const siteID = (process.env.BLOBS_SITE_ID || '').trim();
  const token = (process.env.BLOBS_TOKEN || '').trim();

  return getStore({ name: 'qm2026', siteID, token });
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

    // Compatibilidad: acepta sessionId (frontend) o sessionToken (viejo)
    const sessionId = String(body.sessionId || body.sessionToken || '').trim();
    const deviceId = String(body.deviceId || '').trim();

    if (!sessionId) return json(400, { error: 'Falta sessionId.' });
    if (!deviceId) return json(400, { error: 'Falta deviceId.' });

    const session = await store.get(`sessions/${sessionId}`, { type: 'json' });

    if (!session) return json(401, { error: 'Sesión inválida.' });
    if (session.deviceId !== deviceId) return json(401, { error: 'Sesión no coincide con este dispositivo.' });

    return json(200, { ok: true, userId: session.userId });
  } catch (e) {
    return json(500, { error: 'Error interno al verificar sesión.', detail: String(e?.message || e) });
  }
};
