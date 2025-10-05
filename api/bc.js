// api/bc.js
// BigCommerce Admin REST proxy (no Catalyst) + CORS for Showit + final domains.
// Ops: products, productByPath, variantStock.
// Uses Store API account creds via env: BC_STORE_HASH, BC_ACCESS_TOKEN, BC_CLIENT_ID.

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // Allowlist
  const ALLOW_EXACT = [
    "https://dirtybastardscollective-llc-4.showitpreview.com",
    "https://dirtybastardscollective-llc-4.showit.site",
    "https://dirtybastardscollective.com",
    "https://www.dirtybastardscollective.com",
  ];
  const allowed =
    !!origin &&
    (origin.endsWith(".showit.site") ||
      origin.endsWith(".showitpreview.com") ||
      ALLOW_EXACT.includes(origin));

  // CORS / preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).end();
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "*");
  res.setHeader("Vary", "Origin");

  // Env
  const STORE_HASH = process.env.BC_STORE_HASH;       // e.g. dixtnk4p46
  const ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN;   // Store API account Access Token
  const CLIENT_ID = process.env.BC_CLIENT_ID;         // Store API account Client ID
  if (!STORE_HASH || !ACCESS_TOKEN || !CLIENT_ID) {
    res.status(500).json({ error: "Missing env: BC_STORE_HASH, BC_ACCESS_TOKEN, or BC_CLIENT_ID" });
    return;
  }

  const API_BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}`;

  // Helper: Admin API fetch (v3 by default)
  async function bc(pathname, init = {}, version = "v3") {
    const url = `${API_BASE}/${version}${pathname}`;
    const r = await fetch(url, {
      method: "GET",
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": ACCESS_TOKEN,
        "X-Auth-Client": CLIENT_ID,
        Accept: "application/json",
        ...(init.headers || {}),
      },
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    if (!r.ok) {
      throw new Error(`BC ${r.status} ${pathname}: ${text.slice(0, 400)}`);
    }
    return json ?? {};
  }

  // Inputs
  const { op, limit = 50, path, variantId } =
    req.method === "GET" ? req.query : (req.body || {});

  try {
    // --- OP: products (Shop All grid) ---
    if (op === "products") {
      // NOTE: custom_url is part of the product object; don't put it in `include`.
      // primary_image requires `include=primary_image`.
      const perPage = Math.min(Number(limit) || 50, 250);
      const resp = await bc(`/catalog/products?is_visible=true&include=primary_image&limit=${perPage}&page=1`);
      const items = (resp.data || []).map(p => ({
        name: p.name,
        path: p.custom_url?.url || `/product-${p.id}`,
        defaultImage: { urlOriginal: p.primary_image?.url_standard || "" },
        prices: { price: { value: Number(p.price || 0) } },
        _id: p.id,
      }));
      res.status(200).json({
        data: { site: { products: { edges: items.map(n => ({ node: n })) } } },
      });
      return;
    }

    // --- OP: productByPath (Product Detail) ---
    if (op === "productByPath") {
      const wantedPath = (path || "/").toLowerCase().replace(/\/+$/, "") || "/";

      // Grab a page of visible products to resolve the slug by custom_url.url
      const resp = await bc(`/catalog/products?is_visible=true&include=primary_image&limit=250&page=1`);
      const products = resp.data || [];
      const prod = products.find(p => {
        const url = (p.custom_url?.url || "").toLowerCase().replace(/\/+$/, "");
        // allow with/without leading slash
        return url === wantedPath || url === `/${wantedPath.replace(/^\/?/, "")}`;
      });

      if (!prod) {
        res.status(200).json({ data: { site: { route: { node: null } } } });
        return;
      }

      // Fetch images (v3 images list)
      let images = [];
      try {
        const imgResp = await bc(`/catalog/products/${prod.id}/images?limit=250&page=1`);
        images = (imgResp.data || []).map(img => ({ node: { urlOriginal: img.url_standard } }));
      } catch { /* optional */ }

      // Fetch variants
      let variantEdges = [];
      try {
        const varsResp = await bc(`/catalog/products/${prod.id}/variants?limit=250&page=1`);
        variantEdges = (varsResp.data || []).map(v => ({
          node: {
            entityId: v.id,
            defaultImage: { urlOriginal: v.image_url || prod.primary_image?.url_standard || "" },
            inventory: { isInStock: v.inventory_level == null ? true : Number(v.inventory_level) > 0 },
            optionValues: {
              edges: (v.option_values || []).map(ov => ({
                node: { label: ov.label || ov.option_display_name || "" },
              })),
            },
          },
        }));
      } catch { /* optional */ }

      const node = {
        entityId: prod.id,
        name: prod.name,
        description: prod.description || "",
        defaultImage: { urlOriginal: prod.primary_image?.url_standard || "" },
        images: { edges: images },
        prices: { price: { value: Number(prod.price || 0), currencyCode: "USD" } },
        variants: { edges: variantEdges },
      };

      res.status(200).json({ data: { site: { route: { node } } } });
      return;
    }

    // --- OP: variantStock (qty + button checks) ---
    if (op === "variantStock") {
      const vid = Number(variantId);
      if (!vid) {
        res.status(400).json({ error: "variantId required" });
        return;
      }
      // admin API direct variant endpoint
      const vResp = await bc(`/catalog/variants/${vid}`);
      const v = vResp.data;
      const isInStock = v ? (v.inventory_level == null ? true : Number(v.inventory_level) > 0) : true;
      res.status(200).json({
        data: { site: { productVariant: { entityId: vid, inventory: { isInStock } } } },
      });
      return;
    }

    res.status(400).json({ error: "Unknown op" });
  } catch (e) {
    res.status(502).json({ error: e.message || String(e) });
  }
}
