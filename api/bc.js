// api/bc.js
// BigCommerce Admin REST proxy (no Catalyst needed) + CORS for Showit + final domains.
// Supports ops: products, productByPath, variantStock.
// Uses your Store API account (server-side): BC_STORE_HASH, BC_ACCESS_TOKEN, BC_CLIENT_ID.

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // Allowlist (exact matches)
  const ALLOW_EXACT = [
    // Showit (keep during migration)
    "https://dirtybastardscollective-llc-4.showitpreview.com",
    "https://dirtybastardscollective-llc-4.showit.site",
    // Final domains
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

  // ---- BigCommerce Admin API creds (set in Vercel → Environment Variables) ----
  const STORE_HASH = process.env.BC_STORE_HASH;         // e.g. dixtnk4p46
  const ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN;     // from your Store API account
  const CLIENT_ID = process.env.BC_CLIENT_ID;           // from your Store API account

  if (!STORE_HASH || !ACCESS_TOKEN || !CLIENT_ID) {
    res.status(500).json({ error: "Missing env: BC_STORE_HASH, BC_ACCESS_TOKEN, or BC_CLIENT_ID" });
    return;
  }

  const API_BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3`;

  // Inputs
  const { op, limit = 50, path, variantId } =
    req.method === "GET" ? req.query : (req.body || {});

  // Helper: Admin API fetch
  async function bc(pathname, init = {}) {
    const url = `${API_BASE}${pathname}`;
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
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`BC ${r.status} ${pathname}: ${text.slice(0, 400)}`);
    }
    return r.json();
  }

  try {
    if (op === "products") {
      // List products (visible), include image + URL. Limit to 'limit' items.
      const perPage = Math.min(Number(limit) || 50, 250);
      const resp = await bc(`/catalog/products?is_visible=true&include=primary_image,custom_url&limit=${perPage}&page=1`);
      const items = (resp.data || []).map(p => ({
        name: p.name,
        path: p.custom_url?.url || `/product-${p.id}`, // fallback
        defaultImage: { urlOriginal: p.primary_image?.url_standard || "" },
        prices: { price: { value: Number(p.price || 0) } },
        _id: p.id,
      }));
      res.status(200).json({ data: { site: { products: { edges: items.map(n => ({ node: n })) } } } });
      return;
    }

    if (op === "productByPath") {
      // Resolve Showit path → BigCommerce product by matching custom_url.url
      // We’ll scan first 250 visible products (expand later if needed).
      const wantedPath = (path || "/").toLowerCase().replace(/\/+$/, "") || "/";
      const resp = await bc(`/catalog/products?is_visible=true&include=primary_image,custom_url&limit=250&page=1`);
      const products = resp.data || [];
      const prod = products.find(p => {
        const url = (p.custom_url?.url || "").toLowerCase().replace(/\/+$/, "");
        return url === wantedPath || url === `/${wantedPath.replace(/^\/?/, "")}`;
      });

      if (!prod) {
        res.status(200).json({ data: { site: { route: { node: null } } } });
        return;
      }

      // Variants
      const varsResp = await bc(`/catalog/products/${prod.id}/variants?limit=250&page=1`);
      const variants = (varsResp.data || []).map(v => ({
        entityId: v.id,
        defaultImage: { urlOriginal: v.image_url || prod.primary_image?.url_standard || "" },
        inventory: { isInStock: v.inventory_level == null ? true : Number(v.inventory_level) > 0 },
        optionValues: {
          edges: (v.option_values || []).map(ov => ({
            node: { label: ov.label || ov.option_display_name || "" },
          })),
        },
      }));

      const node = {
        entityId: prod.id,
        name: prod.name,
        description: prod.description || "",
        defaultImage: { urlOriginal: prod.primary_image?.url_standard || "" },
        images: {
          edges: (prod.images || []).map(img => ({ node: { urlOriginal: img.url_standard } })),
        },
        prices: { price: { value: Number(prod.price || 0), currencyCode: "USD" } },
        variants: { edges: variants.map(v => ({ node: v })) },
      };

      res.status(200).json({ data: { site: { route: { node } } } });
      return;
    }

    if (op === "variantStock") {
      // Quick stock for a variant id (by Admin API)
      const vid = Number(variantId);
      if (!vid) {
        res.status(400).json({ error: "variantId required" });
        return;
      }
      // We don't know the product id here; admin API supports direct variant fetch:
      const vResp = await bc(`/catalog/variants/${vid}`);
      const v = vResp.data;
      const isInStock = v ? (v.inventory_level == null ? true : Number(v.inventory_level) > 0) : true;
      res.status(200).json({ data: { site: { productVariant: { entityId: vid, inventory: { isInStock } } } } });
      return;
    }

    res.status(400).json({ error: "Unknown op" });
  } catch (e) {
    res.status(502).json({ error: e.message || String(e) });
  }
}
