/* DBC Checkout Injector v4
 * One file, loaded on BigCommerce Checkout only.
 * - Scoped CSS (no font resets)
 * - Brand colors: bg #231f20, text #ffffff, accent #f0783d
 * - Repoint logo to site home
 * - “Edit cart” → back to site with ?openCart=1
 * - Self-test badge + console log so you know it loaded
 */
(function DBC_CHECKOUT_INJECTOR(){
  // --- config ---
  var BRAND_BG = "#231f20";
  var BRAND_TEXT = "#ffffff";
  var BRAND_ACCENT = "#f0783d";
  var SITE_HOME = "https://dirtybastardscollective.com/";
  var EDIT_CART_TARGET = "https://dirtybastardscollective.com/?openCart=1";

  // --- self-test ---
  try { console.log("✅ DBC checkout injector v4 loaded"); } catch(_) {}

  // inject styles (scoped to checkout containers)
  function injectStyles(css){
    try {
      var style = document.createElement("style");
      style.type = "text/css";
      style.setAttribute("data-dbc","checkout-css");
      style.appendChild(document.createTextNode(css));
      document.head.appendChild(style);
    } catch(e){ console.warn("DBC: style inject failed", e); }
  }

  function buildCSS(){
    return `
      :root{ --dbc-bg:${BRAND_BG}; --dbc-fg:${BRAND_TEXT}; --dbc-accent:${BRAND_ACCENT}; }

      /* SCOPED: do not touch html/body so site fonts/links remain */
      .layout, .page, .checkout, .optimizedCheckout-form-checkout,
      .optimizedCheckout-contentPrimary, .optimizedCheckout-contentSecondary {
        background: var(--dbc-bg) !important;
      }

      /* Headings & text inside checkout columns */
      .optimizedCheckout-contentPrimary h1, .optimizedCheckout-contentPrimary h2,
      .optimizedCheckout-contentPrimary h3, .optimizedCheckout-contentPrimary h4,
      .optimizedCheckout-contentPrimary h5, .optimizedCheckout-contentPrimary h6,
      .optimizedCheckout-contentPrimary p,
      .optimizedCheckout-contentSecondary h1, .optimizedCheckout-contentSecondary h2,
      .optimizedCheckout-contentSecondary h3, .optimizedCheckout-contentSecondary h4,
      .optimizedCheckout-contentSecondary h5, .optimizedCheckout-contentSecondary h6,
      .optimizedCheckout-contentSecondary p,
      .optimizedCheckout-headingPrimary, .optimizedCheckout-headingSecondary,
      .cart-priceItem, .cart-total, .cart-priceItem-value, .cart-total-value,
      .alertBox, .alertBox-message {
        color: var(--dbc-fg) !important;
      }

      /* Inputs */
      .optimizedCheckout-contentPrimary input,
      .optimizedCheckout-contentPrimary select,
      .optimizedCheckout-contentPrimary textarea,
      .optimizedCheckout-contentSecondary input,
      .optimizedCheckout-contentSecondary select,
      .optimizedCheckout-contentSecondary textarea {
        background: #1c1a1a !important;
        color: var(--dbc-fg) !important;
        border: 1px solid #4a4a4a !important;
      }
      .optimizedCheckout-contentPrimary input::placeholder,
      .optimizedCheckout-contentPrimary textarea::placeholder,
      .optimizedCheckout-contentSecondary input::placeholder,
      .optimizedCheckout-contentSecondary textarea::placeholder {
        color: #bbbbbb !important;
      }

      /* Buttons (accent) */
      .optimizedCheckout-contentPrimary .button,
      .optimizedCheckout-contentPrimary button,
      .optimizedCheckout-contentPrimary [type="submit"],
      .optimizedCheckout-contentPrimary .button--primary,
      .optimizedCheckout-contentPrimary .button--action,
      .optimizedCheckout-contentSecondary .button,
      .optimizedCheckout-contentSecondary button,
      .optimizedCheckout-contentSecondary [type="submit"],
      .optimizedCheckout-contentSecondary .button--primary,
      .optimizedCheckout-contentSecondary .button--action {
        background: transparent !important;
        color: var(--dbc-accent) !important;
        border: 1px solid var(--dbc-accent) !important;
        box-shadow: none !important;
      }
      .optimizedCheckout-contentPrimary .button:disabled,
      .optimizedCheckout-contentSecondary .button:disabled,
      .optimizedCheckout-contentPrimary [type="submit"]:disabled,
      .optimizedCheckout-contentSecondary [type="submit"]:disabled {
        opacity: .5 !important; cursor: not-allowed !important;
      }

      /* Tiny badge so you can SEE it loaded; fades out */
      #dbc-badge {
        position: fixed; right: 10px; bottom: 10px;
        background: var(--dbc-accent); color: #000; padding: 6px 10px;
        font-size: 12px; border-radius: 6px; z-index: 999999;
        pointer-events: none; opacity: .95; transition: opacity .6s ease;
      }
    `;
  }

  function badge(){
    try {
      var b = document.createElement("div");
      b.id = "dbc-badge";
      b.textContent = "DBC styles v4";
      document.body.appendChild(b);
      setTimeout(function(){ b.style.opacity = "0"; }, 2000);
      setTimeout(function(){ b.remove(); }, 2800);
    } catch(_){}
  }

  // logo → SITE_HOME
  function patchLogoLink(){
    try {
      var candidates = Array.from(document.querySelectorAll(
        ".header-logo a, .optimizedCheckout-header a, header a, .checkoutHeader a"
      ));
      candidates.forEach(function(a){
        if (a.querySelector("img") || /logo/i.test(a.className||"")) {
          a.setAttribute("href", SITE_HOME);
          a.setAttribute("target","_self");
          a.setAttribute("rel","noopener");
        }
      });
    } catch(e){ console.warn("DBC: patchLogoLink failed", e); }
  }

  // “Edit cart” → back to your site (opens drawer via ?openCart=1)
  function rewireEditCart(){
    try {
      var links = Array.from(document.querySelectorAll(
        ".checkoutHeader a, .header a, a.button, a.link, a"
      ));
      var candidates = links.filter(function(a){
        var t = (a.textContent||"").trim().toLowerCase();
        return t.includes("edit") && t.includes("cart");
      });
      candidates = candidates.concat(Array.from(document.querySelectorAll(
        ".header-continueShopping, .cart-modal-link, a[data-test='step-header-edit']"
      )));
      candidates = Array.from(new Set(candidates));
      candidates.forEach(function(a){
        a.setAttribute("href", EDIT_CART_TARGET);
        a.setAttribute("target","_self");
        a.setAttribute("rel","noopener");
      });
    } catch(e){ console.warn("DBC: rewireEditCart failed", e); }
  }

  function runAll(){
    injectStyles(buildCSS());
    patchLogoLink();
    rewireEditCart();
    badge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runAll);
  } else {
    runAll();
  }
  // Retry to catch late-hydrating nodes
  setTimeout(runAll, 600);
  setTimeout(runAll, 1500);
})();
