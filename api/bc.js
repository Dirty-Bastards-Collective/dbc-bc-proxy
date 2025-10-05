// api/bc.js
// BigCommerce Admin REST proxy for Showit: products, productByPath, variantStock, checkout
export default async function handler(req, res) {
  const origin = req.headers.origin || "";
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

  // CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "*");
  res.setHeader("Vary", "Origin");

  // Env (already configured)
  const STORE_HASH = process.env.BC_STORE_HASH;
  const ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN;
  const CLIENT_ID = process.env.BC_CLIENT_ID;
  if (!STORE_HASH || !ACCESS_TOKEN || !CLIENT_ID) {
    return res.status(500).json({ error: "Missing env: BC_STORE_HASH, BC_ACCESS_TOKEN, or BC_CLIENT_ID" });
  }
  const API_BASE = `https://api.bigcommerce.com/stores/${STORE_HASH}`;

  // Helper for v3
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
    if (!r.ok) throw new Error(`BC ${r.status} ${pathname}: ${text.slice(0, 400)}`);
    return json ?? {};
  }

  const body = req.method === "GET" ? req.query : (req.body || {});
  const { op } = body;

  try {
    // Shop All
    if (op === "products") {
      const limit = Math.min(Number(body.limit) || 50, 250);
      const resp = await bc(`/catalog/products?is_visible=true&include=primary_image&limit=${limit}&page=1`);
      const items = (resp.data || []).map(p => ({
        name: p.name,
        path: p.custom_url?.url || `/product-${p.id}`,
        defaultImage: { urlOriginal: p.primary_image?.url_standard || "" },
        prices: { price: { value: Number(p.price || 0) } },
        _id: p.id,
      }));
      return res.status(200).json({
        data: { site: { products: { edges: items.map(n => ({ node: n })) } } },
      });
    }

    // Product Detail by path
    if (op === "productByPath") {
      const wantedPath = (body.path || "/").toLowerCase().replace(/\/+$/, "") || "/";
      const list = await bc(`/catalog/products?is_visible=true&include=primary_image&limit=250&page=1`);
      const products = list.data || [];
      const prod = products.find(p => {
        const url = (p.custom_url?.url || "").toLowerCase().replace(/\/+$/, "");
        return url === wantedPath || url === `/${wantedPath.replace(/^\/?/, "")}`;
      });
      if (!prod) {
        return res.status(200).json({ data: { site: { route: { node: null } } } });
      }

      // Images
      let images = [];
      try {
        const imgResp = await bc(`/catalog/products/${prod.id}/images?limit=250&page=1`);
        images = (imgResp.data || []).map(img => ({ node: { urlOriginal: img.url_standard } }));
      } catch {}

      // Variants
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
      } catch {}

      const node = {
        entityId: prod.id,
        name: prod.name,
        description: prod.description || "",
        defaultImage: { urlOriginal: prod.primary_image?.url_standard || "" },
        images: { edges: images },
        prices: { price: { value: Number(prod.price || 0), currencyCode: "USD" } },
        variants: { edges: variantEdges },
      };
      return res.status(200).json({ data: { site: { route: { node } } } });
    }

    // Stock check
    if (op === "variantStock") {
      const vid = Number(body.variantId);
      if (!vid) return res.status(400).json({ error: "variantId required" });
      const vResp = await bc(`/catalog/variants/${vid}`);
      const v = vResp.data;
      const isInStock = v ? (v.inventory_level == null ? true : Number(v.inventory_level) > 0) : true;
      return res.status(200).json({
        data: { site: { productVariant: { entityId: vid, inventory: { isInStock } } } },
      });
    }

    // NEW: Checkout
    // body.items = [{ variantId, quantity }]
    if (op === "checkout") {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return res.status(400).json({ error: "No items" });

      // Map each variant to its product_id
      const line_items = [];
      for (const it of items) {
        const vId = Number(it.variantId);
        const qty = Number(it.quantity) || 1;
        if (!vId) continue;
        const v = await bc(`/catalog/variants/${vId}`);
        const product_id = v?.data?.product_id;
        if (!product_id) throw new Error(`Variant ${vId} missing product_id`);
        line_items.push({ quantity: qty, product_id, variant_id: vId });
      }
      if (!line_items.length) return res.status(400).json({ error: "No valid line items" });

      // Create cart with redirect URLs
      const cartCreate = await bc(`/carts?include=redirect_urls`, {
        method: "POST",
        body: JSON.stringify({ line_items: line_items.map(li => ({ quantity: li.quantity, product_id: li.product_id, variant_id: li.variant_id })) }),
      });
      const cartId = cartCreate?.data?.id;
      let checkoutUrl = cartCreate?.data?.redirect_urls?.checkout_url;

      if (!checkoutUrl && cartId) {
        const redir = await bc(`/carts/${cartId}/redirect_urls`, { method: "POST", body: JSON.stringify({}) });
        checkoutUrl = redir?.data?.checkout_url;
      }
      if (!checkoutUrl) throw new Error("Could not create checkout URL");

      return res.status(200).json({ checkoutUrl, cartId });
    }

    return res.status(400).json({ error: "Unknown op" });
  } catch (e) {
    return res.status(502).json({ error: e.message || String(e) });
  }
}
