/* DBC Checkout Injector (v3)
 * - Injects minimal CSS (bg #231f20, white text, accent #f0783d)
 * - Repoints header logo to your site
 * - Rewires “Edit cart” to return to your site and open the cart
 * Safe-by-default: no global leaks, retries in case checkout hydrates late.
 */
(function DBC_CHECKOUT_INJECTOR() {
  var BRAND_BG = "#231f20";
  var BRAND_TEXT = "#ffffff";
  var BRAND_ACCENT = "#f0783d";
  var SITE_HOME = "https://dirtybastardscollective.com/";
  var EDIT_CART_TARGET = "https://dirtybastardscollective.com/?openCart=1";

  /* ============ 1) CSS Injection ============ */
  function injectStyles(css) {
    try {
      var style = document.createElement("style");
      style.type = "text/css";
      style.setAttribute("data-dbc", "checkout-css");
      style.appendChild(document.createTextNode(css));
      document.head.appendChild(style);
    } catch (e) {
      console.warn("DBC: style inject failed", e);
    }
  }

  function buildCSS() {
    return `
      /* ====== DBC minimal theme ====== */
      :root {
        --dbc-bg: ${BRAND_BG};
        --dbc-fg: ${BRAND_TEXT};
        --dbc-accent: ${BRAND_ACCENT};
      }

      html, body {
        background: var(--dbc-bg) !important;
        color: var(--dbc-fg) !important;
      }

      /* Main shells BigCommerce uses */
      .layout, .page, .optimizedCheckout-contentPrimary, .optimizedCheckout-contentSecondary,
      .optimizedCheckout-form-checkout, .checkout {
        background: var(--dbc-bg) !important;
        color: var(--dbc-fg) !important;
      }

      /* Headings & common text */
      h1, h2, h3, h4, h5, h6,
      .optimizedCheckout-headingPrimary,
      .optimizedCheckout-headingSecondary,
      .optimizedCheckout-contentPrimary p,
      .optimizedCheckout-contentSecondary p,
      .form-field-label,
      .form-label,
      .cart-priceItem,
      .cart-total {
        color: var(--dbc-fg) !important;
      }

      /* Links & accents */
      a, .link, .optimizedCheckout-header a {
        color: var(--dbc-accent) !important;
      }
      a:hover, .link:hover {
        opacity: .9;
      }

      /* Buttons (keep BC layout, just recolor) */
      .button, button, [type="submit"], .button--primary, .button--action {
        background: transparent !important;
        color: var(--dbc-accent) !important;
        border: 1px solid var(--dbc-accent) !important;
        box-shadow: none !important;
      }
      .button:disabled, [type="submit"]:disabled {
        opacity: .5 !important;
        cursor: not-allowed !important;
      }

      /* Inputs */
      input, select, textarea {
        background: #1c1a1a !important;
        color: var(--dbc-fg) !important;
        border: 1px solid #4a4a4a !important;
      }
      input::placeholder, textarea::placeholder {
        color: #bbbbbb !important;
      }

      /* Panels / boxes */
      .form-field, .form-legend, .form-body,
      .checkout-view-header, .checkout-view-content,
      .cart, .cart-section {
        background: transparent !important;
        color: var(--dbc-fg) !important;
      }

      /* Totals box */
      .cart-priceItem-value, .cart-total-value {
        color: var(--dbc-fg) !important;
      }

      /* Errors / alerts keep contrast */
      .alertBox, .alertBox-message {
        color: var(--dbc-fg) !important;
      }
    `;
  }

  /* ============ 2) Patch Header Logo Link ============ */
  function patchLogoLink() {
    try {
      var candidates = Array.from(document.querySelectorAll(
        ".header-logo a, .optimizedCheckout-header a, header a, .checkoutHeader a"
      ));
      if (!candidates.length) return;

      candidates.forEach(function(a) {
        // Make sure it's the brand/home logo link (often wraps an <img>)
        if (a.querySelector("img") || /logo/i.test(a.className || "")) {
          a.setAttribute("href", SITE_HOME);
          a.setAttribute("target", "_self");
          a.setAttribute("rel", "noopener");
        }
      });
    } catch (e) {
      console.warn("DBC: patchLogoLink failed", e);
    }
  }

  /* ============ 3) EDIT CART → back to site & open drawer ============ */
  function rewireEditCart() {
    try {
      var links = Array.from(document.querySelectorAll(
        ".checkoutHeader a, .header a, a.button, a.link, a"
      ));
      // Prefer text matches “edit” + “cart”
      var candidates = links.filter(function(a) {
        var t = (a.textContent || "").trim().toLowerCase();
        return t.includes("edit") && t.includes("cart");
      });

      // Common BC selectors (fallbacks)
      candidates = candidates.concat(Array.from(document.querySelectorAll(
        ".header-continueShopping, .cart-modal-link, a[data-test='step-header-edit']"
      )));

      // Dedup
      candidates = Array.from(new Set(candidates));

      candidates.forEach(function(a) {
        a.setAttribute("href", EDIT_CART_TARGET);
        a.setAttribute("target", "_self");
        a.setAttribute("rel", "noopener");
        // Optional label tweak:
        // a.textContent = "Back to Cart";
      });
    } catch (e) {
      console.warn("DBC: rewireEditCart failed", e);
    }
  }

  /* ============ Boot ============ */
  function runAll() {
    injectStyles(buildCSS());
    patchLogoLink();
    rewireEditCart();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runAll);
  } else {
    runAll();
  }
  // Retry a couple times for late-hydrating checkout DOM
  setTimeout(runAll, 600);
  setTimeout(runAll, 1500);
})();
