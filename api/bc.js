// api/bc.js
// Proxy → Catalyst with CORS + DIAGNOSTICS (temporary to find the working combo)

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
  const HOST = process.env.CATALYST_HOST;
  const SITE_KEY = process.env.CATALYST_SITE_API_KEY;
  if (!HOST || !SITE_KEY) {
    res.status(500).json({ error: "Missing env: CATALYST_HOST or CATALYST_SITE_API_KEY" });
    return;
  }

  // Inputs
  const { op, limit = 50, path, variantId, debug } =
    req.method === "GET" ? req.query : (req.body || {});

  // GraphQL
  let query, variables;
  if (op === "products") {
    query = `
      query GetProducts($limit: Int!) {
        site {
          products(first: $limit) {
            edges {
              node {
                name
                path
                defaultImage { urlOriginal }
                prices { price { value } }
              }
            }
          }
        }
      }`;
    variables = { limit: Number(limit) || 50 };
  } else if (op === "productByPath") {
    query = `
      query GetProduct($path: String!) {
        site {
          route(path: $path) {
            node {
              ... on Product {
                entityId
                name
                description
                defaultImage { urlOriginal }
                images { edges { node { urlOriginal } } }
                prices { price { value currencyCode } }
                variants(first: 20) {
                  edges { node {
                    entityId
                    defaultImage { urlOriginal }
                    inventory { isInStock }
                    optionValues { edges { node { label } } }
                  } }
                }
              }
            }
          }
        }
      }`;
    variables = { path: path?.startsWith("/") ? path : `/${path}` };
  } else if (op === "variantStock") {
    query = `
      query VariantStock($variantId: Int!) {
        site {
          productVariant(entityId: $variantId) {
            entityId
            inventory { isInStock }
          }
        }
      }`;
    variables = { variantId: Number(variantId) };
  } else {
    res.status(400).json({ error: "Unknown op" });
    return;
  }

  // Candidate endpoints + header names (Catalyst installs vary)
  const endpoints = [
    `${HOST}/api/storefront`,
    `${HOST}/api/storefront/graphql`,
    `${HOST}/graphql`,
    `${HOST}/storefront/graphql`,
    `${HOST}/api/graphql`,
  ];

  const headersVariants = [
    { "Content-Type": "application/json", "x-site-api-key": SITE_KEY },
    { "Content-Type": "application/json", "x-api-key": SITE_KEY },
    { "Content-Type": "application/json", "Authorization": `Bearer ${SITE_KEY}` },
    { "Content-Type": "application/json", "authorization": `Bearer ${SITE_KEY}` },
    { "Content-Type": "application/json", "X-Site-Api-Key": SITE_KEY },
    { "Content-Type": "application/json", "X-Api-Key": SITE_KEY },
    { "Content-Type": "application/json", "x-catalyst-site-api-key": SITE_KEY },
  ];

  const body = JSON.stringify({ query, variables });

  const attempts = [];
  for (const url of endpoints) {
    for (const headers of headersVariants) {
      try {
        const r = await fetch(url, { method: "POST", headers, body });
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}
        if (r.ok && json && json.data) {
          res.status(200).json(json);
          return;
        }
        attempts.push({
          url,
          status: r.status,
          ok: r.ok,
          headers: Object.keys(headers),       // never echo actual key values
          bodyPreview: text.slice(0, 300)      // short preview only
        });
      } catch (e) {
        attempts.push({
          url,
          status: "FETCH_ERROR",
          ok: false,
          headers: Object.keys(headers),
          bodyPreview: String(e).slice(0, 300)
        });
      }
    }
  }

  // If debug flag set, return full attempts list so we can see what's happening
  if (debug) {
    res.status(502).json({
      error: "Upstream not accepted; see attempts",
      host: HOST,
      attempts
    });
    return;
  }

  // Otherwise return concise error
  res.status(502).json({ error: "Catalyst upstream did not accept any endpoint/header combo", host: HOST });
}
