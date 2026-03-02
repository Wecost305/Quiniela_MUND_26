const crypto = require("node:crypto");
const { getStore } = require("@netlify/blobs");
const { json } = require("./_common");

function randToken(bytes = 18) {
  // URL-safe token
  return crypto.randomBytes(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  const adminKeyEnv = (process.env.ADMIN_KEY || "").trim();
  const adminKey = (event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "").trim();

  if (!adminKeyEnv || adminKey !== adminKeyEnv) {
    return json(401, { error: "No autorizado." });
  }

  try {
    const store = getStore({ name: "qm2026", consistency: "strong" });

    const token = randToken(18);
    const userId = "u_" + randToken(10);
    const now = Date.now();

    const inviteKey = `invites/${token}`;

    // onlyIfNew para evitar colisiones (raro pero correcto)
    const { modified } = await store.setJSON(inviteKey, {
      token,
      userId,
      createdAt: now,
      used: false
    }, { onlyIfNew: true });

    if (!modified) {
      return json(500, { error: "No se pudo crear la invitación. Intenta de nuevo." });
    }

    const proto = (event.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
    const host = (event.headers.host || "").trim();
    const origin = host ? `${proto}://${host}` : "";
    const inviteUrl = origin ? `${origin}/?invite=${encodeURIComponent(token)}` : `/?invite=${encodeURIComponent(token)}`;

    return json(200, { token, userId, inviteUrl });

  } catch (e) {
    return json(500, { error: "Error interno al crear invitación." });
  }
};
