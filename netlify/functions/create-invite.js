import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { json } from './_common.js';

function randToken(bytes = 18) {
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const adminKeyEnv = (process.env.ADMIN_KEY || '').trim().normalize('NFKC');
  const adminKey = (req.headers.get('x-admin-key') || '').trim().normalize('NFKC');

  if (!adminKeyEnv || adminKey !== adminKeyEnv) {
    return json(401, { error: 'No autorizado.' });
  }

  try {
    // store-level strong consistency (válido en Netlify Blobs)
    const store = getStore({ name: 'qm2026', consistency: 'strong' }); :contentReference[oaicite:1]{index=1}

    const now = Date.now();
    let token = '';
    let userId = '';
    let inviteKey = '';

    for (let i = 0; i < 10; i++) {
      token = randToken(18);
      userId = 'u_' + randToken(10);
      inviteKey = `invites/${token}`;

      const existing = await store.get(inviteKey, { consistency: 'strong' });
      if (existing === null) break;
      token = '';
    }

    if (!token) {
      return json(500, { error: 'No se pudo generar un token único. Intenta de nuevo.' });
    }

    await store.setJSON(inviteKey, {
      token,
      userId,
      createdAt: now,
      used: false
    });

    const origin = new URL(req.url).origin;
    const inviteUrl = `${origin}/?invite=${encodeURIComponent(token)}`;

    return json(200, { token, userId, inviteUrl });
  } catch (e) {
    return json(500, { error: 'Error interno al crear invitación.', detail: String(e?.message || e) });
  }
}
