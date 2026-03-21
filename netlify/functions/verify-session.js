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
    const sessionToken = String(body.sessionToken || '').trim();
    const deviceId = String(body.deviceId || '').trim();

    if (!sessionToken) return json(400, { error: 'Falta sessionToken.' });
    if (!deviceId) return json(400, { error: 'Falta deviceId.' });

    const session = await store.getJSON(`sessions/${sessionToken}`);
    if (!session) return json(401, { error: 'Sesión inválida.' });

    if (session.deviceId !== deviceId) {
      return json(401, { error: 'Sesión no coincide con este dispositivo.' });
    }

    return json(200, { ok: true, userId: session.userId });
  } catch (e) {
    return json(500, { error: 'Error interno al verificar sesión.', detail: String(e?.message || e) });
  }
};
