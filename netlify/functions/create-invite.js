import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { json } from './_common.js';

function randToken(bytes = 18) {
  // URL-safe token
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export default async function handler(req, context) {
  if (req.method !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const adminKeyEnv = (process.env.ADMIN_KEY || '').trim().normalize('NFKC');
  const adminKey = (req.headers.get('x-admin-key') || '').trim().normalize('NFKC');

  if (!adminKeyEnv || adminKey !== adminKeyEnv) {
    return json(401, { error: 'No autorizado.' });
  }

  try {
    // Netlify Blobs necesita Functions v2 (export default) para tener contexto
    const store = getStore({ name: 'qm2026', consistency: 'strong' });

    const token = randToken(18);
    const userId = 'u_' + randToken(10);
    const now = Date.now();

    const inviteKey = `invites/${token}`;

    const { modified } = await store.setJSON(
      inviteKey,
      {
        token,
        userId,
        createdAt: now,
        used: false
      },
      { onlyIfNew: true }
    );

    if (!modified) {
      return json(500, { error: 'No se pudo crear la invitación. Intenta de nuevo.' });
    }

    const origin = new URL(req.url).origin;
    const inviteUrl = `${origin}/?invite=${encodeURIComponent(token)}`;

    return json(200, { token, userId, inviteUrl });
  } catch (e) {
    // Solo el admin puede llamar este endpoint, así que devolvemos el mensaje para debug.
    return json(500, { error: 'Error interno al crear invitación.', detail: String(e?.message || e) });
  }
}
