// api/bc.js
// Serverless proxy → forwards to Catalyst, adds CORS for Showit + your final domains

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // Allowlist (exact matches)
  const ALLOW_EXACT = [
    // Showit (keep until fully live)
    "https://dirtybastardscollective-llc-4.showitpreview.com",
    "https://dirtybastardscollective-llc-4.showit.site",

    // Final domains (apex + www)
    "https://dirtybastardscollective.com",
    "https://www.dirtybastardscollective.com",
  ];

  // Allow *.showit.site and *.showitpreview.com subdomains too (safety)
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

  // ---- Catalyst config from env ----
  const HOST = process.env.CATALYST_HOST;             // e.g. https://store-...catalyst-...store
  const SITE_KEY = process.env.CATALYST_SITE_API_KEY; // your Site API key

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

  // Try common Catalyst endpoints/headers
  const endpoints = [
    `${HOST}/api/storefront`,
    `${HOST}/api/storefront/graphql`,
    `${HOST}/graphql`,
  ];
  const headersList = [
    { "Content-Type": "application/json", "x-site-api-key": SITE_KEY },
    { "Content-Type": "application/json", "x-api-key": SITE_KEY },
    { "Content-Type": "application/json", "Authorization": `Bearer ${SITE_KEY}` },
  ];

  const body = JSON.stringify({ query, variables });

  for (const url of endpoints) {
    for (const headers of headersList) {
      try {
        const r = await fetch(url, { method: "POST", headers, body });
        if (!r.ok) continue;
        const json = await r.json();
        if (json?.data) {
          res.status(200).json(json);
          return;
        }
      } catch (_) {
        // try next combo
      }
    }
  }

  res.status(502).json({ error: "No Catalyst endpoint accepted the request" });
}
