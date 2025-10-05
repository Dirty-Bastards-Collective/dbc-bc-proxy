// api/bc.js
// Serverless proxy → forwards to Catalyst, adds CORS for Showit + your final domains
// Works with https://dbc-bc-proxy.vercel.app (make sure env vars are set in Vercel)

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // Allowlist (exact matches)
  const ALLOW_EXACT = [
    // Showit (keep while migrating)
    "https://dirtybastardscollective-llc-4.showitpreview.com",
    "https://dirtybastardscollective-llc-4.showit.site",

    // Final domains (apex + www)
    "https://dirtybastardscollective.com",
    "https://www.dirtybastardscollective.com",
  ];

  // Also accept any *.showit.site / *.showitpreview.com subdomains
  const allowed =
    !!origin &&
    (
      origin.endsWith(".showit.site") ||
      origin.endsWith(".showitpreview.com") ||
      ALLOW_EXACT.includes(origin)
    );

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

  // ---- Catalyst config from env (set these in Vercel: Settings → Environment Variables) ----
  const HOST = process.env.CATALYST_HOST;             // e.g. https://store-dixtnk4p46-1790940.catalyst-sandbox-vercel.store
  const SITE_KEY = process.env.CATALYST_SITE_API_KEY; // your Site API key

  if (!HOST || !SITE_KEY) {
    res.status(500).json({ error: "Missing env: CATALYST_HOST or CATALYST_SITE_API_KEY" });
    return;
  }

  // Accept body or querystring
  const { op, limit = 50, path, variantId } =
    req.method === "GET" ? req.query : (req.body || {});

  // Build GraphQL query/variables
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
                  edges {
                    node {
                      entityId
                      defaultImage { urlOriginal }
                      inventory { isInStock }
                      optionValues { edges { node { label } } }
                    }
                  }
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

  // Try common Catalyst endpoints/headers (Catalyst installs differ slightly)
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

  for (const url of endpoints) {
    for (const headers of headersVariants) {
      try {
        const r = await fetch(url, { method: "POST", headers, body });
        if (!r.ok) continue;
        const json = await r.json();
        if (json?.data) {
          res.status(200).json(json);
          return;
        }
      } catch {
        // try next combo
      }
    }
  }

  // If nothing worked, return a concise 502 (avoid leaking upstream responses)
  res.status(502).json({ error: "Catalyst upstream did not accept any endpoint/header combo", host: HOST });
}
