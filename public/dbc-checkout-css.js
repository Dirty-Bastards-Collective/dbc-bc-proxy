/* DBC Checkout Injector (v3.1 – scoped styles)
 * - Scoped CSS so BC fonts & default links remain intact
 * - Brand bg #231f20, white text for key areas, accent #f0783d on buttons
 * - Repoints header logo to your site
 * - Rewires “Edit cart” to return to your site and open the cart
 */
(function DBC_CHECKOUT_INJECTOR() {
  var BRAND_BG = "#231f20";
  var BRAND_TEXT = "#ffffff";
  var BRAND_ACCENT = "#f0783d";
  var SITE_HOME = "https://dirtybastardscollective.com/";
  var EDIT_CART_TARGET = "https://dirtybastardscollective.com/?openCart=1";

  /* ============ 1) CSS Injection (SCOPED) ============ */
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
      /* ====== DBC minimal theme (SCOPED) ====== */
      :root {
        --dbc-bg: ${BRAND_BG};
        --dbc-fg: ${BRAND_TEXT};
        --dbc-accent: ${BRAND_ACCENT};
      }

      /* Scope to BC checkout containers only (do NOT touch html/body/fonts) */
      .optimizedCheckout-contentPrimary,
      .optimizedCheckout-contentSecondary,
      .layout,
      .page,
      .checkout,
      .optimizedCheckout-form-checkout {
        background: var(--dbc-bg) !important;
      }

      /* Headings & common text inside checkout containers */
      .optimizedCheckout-contentPrimary h1,
      .optimizedCheckout-contentPrimary h2,
      .optimizedCheckout-contentPrimary h3,
      .optimizedCheckout-contentPrimary h4,
      .optimizedCheckout-contentPrimary h5,
      .optimizedCheckout-contentPrimary h6,
      .optimizedCheckout-contentPrimary p,
      .optimizedCheckout-contentSecondary h1,
      .optimizedCheckout-contentSecondary h2,
      .optimizedCheckout-contentSecondary h3,
      .optimizedCheckout-contentSecondary h4,
      .optimizedCheckout-contentSecondary h5,
      .optimizedCheckout-contentSecondary h6,
      .optimizedCheckout-contentSecondary p,
      .optimizedCheckout-headingPrimary,
      .optimizedCheckout-headingSecondary,
      .cart-priceItem,
      .cart-total {
        color: var(--dbc-fg) !important;
      }

      /* Inputs inside checkout only */
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

      /* Panels / boxes remain transparent so layout stays BC-native */
      .optimizedCheckout-contentPrimary .form-field,
      .optimizedCheckout-contentPrimary .form-legend,
      .optimizedCheckout-contentPrimary .form-body,
      .optimizedCheckout-contentSecondary .form-field,
      .optimizedCheckout-contentSecondary .form-legend,
      .optimizedCheckout-contentSecondary .form-body,
      .checkout-view-header, .checkout-view-content,
      .cart, .cart-section {
        background: transparent !important;
        color: var(--dbc-fg) !important;
      }

      /* Totals box values */
      .cart-priceItem-value, .cart-total-value {
        color: var(--dbc-fg) !important;
      }

      /* Buttons (accented) — scoped to checkout containers */
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
        opacity: .5 !important;
        cursor: not-allowed !important;
      }

      /* Alerts — keep readable */
      .alertBox, .alertBox-message {
        color: var(--dbc-fg) !important;
      }

      /* IMPORTANT:
         We do NOT style generic anchors here to avoid killing theme link styles.
         If you need specific links recolored, target them by class later.
      */
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
      var candidates = links.filter(function(a) {
        var t = (a.textContent || "").trim().toLowerCase();
        return t.includes("edit") && t.includes("cart");
      });

      candidates = candidates.concat(Array.from(document.querySelectorAll(
        ".header-continueShopping, .cart-modal-link, a[data-test='step-header-edit']"
      )));
      candidates = Array.from(new Set(candidates));

      candidates.forEach(function(a) {
        a.setAttribute("href", EDIT_CART_TARGET);
        a.setAttribute("target", "_self");
        a.setAttribute("rel", "noopener");
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
  setTimeout(runAll, 600);
  setTimeout(runAll, 1500);
})();
