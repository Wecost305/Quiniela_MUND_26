const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');
const { json } = require('./_common');

function randToken(bytes = 24) {
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getConfiguredStore(event) {
  try { connectLambda(event); } catch (e) { /* ignore */ }

  const siteID = (process.env.BLOBS_SITE_ID || '').trim();
  const token = (process.env.BLOBS_TOKEN || '').trim();

  // En producción exigimos siteID + token para evitar MissingBlobsEnvironmentError
  return getStore({ name: 'qm2026', siteID, token });
}

function extractInviteToken(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  // 1) Si pegaron URL completa, extraemos ?invite=...
  try {
    const u = new URL(s);
    const inv = u.searchParams.get('invite') || u.searchParams.get('token');
    if (inv) return String(inv).trim();
  } catch (e) {}

  // 2) Si pegaron algo que contiene invite= sin ser URL válida
  const m = s.match(/[?&]invite=([^&#]+)/i) || s.match(/[?&]token=([^&#]+)/i);
  if (m && m[1]) {
    try { return decodeURIComponent(m[1]).trim(); } catch (e) { return String(m[1]).trim(); }
  }

  // 3) Si pegaron solo el token
  return s;
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

    // Compatibilidad: frontend manda { token }, pero aceptamos también { invite }
    const inviteToken = extractInviteToken(body.token || body.invite || body.inviteToken);
    const deviceId = String(body.deviceId || '').trim();

    if (!inviteToken) return json(400, { error: 'Falta invite token.' });
    if (!deviceId) return json(400, { error: 'Falta deviceId.' });

    const inviteKey = `invites/${inviteToken}`;

    // Netlify Blobs: usa store.get(key, { type:'json' }) (getJSON no existe en algunos runtimes)
    const invite = await store.get(inviteKey, { type: 'json' });

    if (!invite) return json(404, { error: 'Invitación no encontrada.' });
    if (invite.used) return json(409, { error: 'Invitación ya utilizada.' });

    // Marcar como usada y amarrar a dispositivo
    invite.used = true;
    invite.usedAt = Date.now();
    invite.deviceId = deviceId;
    await store.setJSON(inviteKey, invite);

    // Crear sesión
    const sessionId = randToken(24);
    await store.setJSON(`sessions/${sessionId}`, {
      sessionId,
      userId: invite.userId,
      deviceId,
      createdAt: Date.now()
    });

    return json(200, { sessionId, userId: invite.userId });
  } catch (e) {
    return json(500, { error: 'Error interno al canjear invitación.', detail: String(e?.message || e) });
  }
};
