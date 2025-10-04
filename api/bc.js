export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const ALLOW = [
    "https://dirtybastardscollective-llc-4.showitpreview.com"
  ];

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", ALLOW.includes(origin) ? origin : "");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).end();
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", ALLOW.includes(origin) ? origin : "");
  res.setHeader("Vary", "Origin");

  try {
    const { op, limit = 50, path, variantId } = req.method === "GET" ? req.query : req.body || {};
    const ENDPOINT = `https://store-${process.env.BIGCOMMERCE_STORE_HASH}.mybigcommerce.com/graphql`;
    const HEADERS = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.BIGCOMMERCE_STOREFRONT_TOKEN}`
    };

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
      return res.status(400).json({ error: "Unknown op" });
    }

    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ query, variables })
    });
    const json = await r.json();
    if (!r.ok) return res.status(r.status).json(json);
    return res.status(200).json(json);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Proxy error", detail: String(e) });
  }
}
