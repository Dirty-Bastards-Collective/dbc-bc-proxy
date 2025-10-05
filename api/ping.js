// api/ping.js
// Quick auth check against BigCommerce Admin API (v2/time).
export default async function handler(req, res) {
  const STORE_HASH = process.env.BC_STORE_HASH;
  const ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN;
  const CLIENT_ID = process.env.BC_CLIENT_ID;

  if (!STORE_HASH || !ACCESS_TOKEN || !CLIENT_ID) {
    res.status(500).json({ error: "Missing env: BC_STORE_HASH, BC_ACCESS_TOKEN, or BC_CLIENT_ID" });
    return;
  }

  const url = `https://api.bigcommerce.com/stores/${STORE_HASH}/v2/time`;

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        "X-Auth-Token": ACCESS_TOKEN,
        "X-Auth-Client": CLIENT_ID,
        "Accept": "application/json",
      },
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    res.status(r.status).json({
      ok: r.ok,
      status: r.status,
      body: json ?? text.slice(0, 400),
    });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e) });
  }
}
