(function () {
  try {
    /* ========= 1) CSS THEME + BACKGROUNDS ========= */
    var css = "\
:root{--dbc-accent:#f0783d;--dbc-text:#ffffff;--dbc-bg:#0b0c0d;}\
/* global surface */\
html,body{background:var(--dbc-bg)!important;}\
body.optimizedCheckout-body{background:var(--dbc-bg)!important;color:var(--dbc-text)!important;font-family:'Roboto Mono', monospace!important;}\
/* common containers/panels */\
.layout,.layout-main,.optimizedCheckout-contentPrimary,.optimizedCheckout-contentSecondary,.optimizedCheckout-orderSummary,.checkout-view-content,.stepHeader,.accordion,.accordion-content,.form-legend,.form-body{background:transparent!important;color:var(--dbc-text)!important;}\
/* headings & text */\
.optimizedCheckout-headingPrimary,.optimizedCheckout-headingSecondary,.optimizedCheckout-contentPrimary h1,.optimizedCheckout-contentPrimary h2,.optimizedCheckout-contentPrimary h3{color:var(--dbc-text)!important;font-family:'Roboto Mono', monospace!important;}\
.optimizedCheckout-contentPrimary,.optimizedCheckout-form-input,.optimizedCheckout-form-label{color:var(--dbc-text)!important;font-family:'Roboto Mono', monospace!important;}\
/* inputs */\
.optimizedCheckout-form-input{background:#1a1c1f!important;border-color:#333!important;color:var(--dbc-text)!important;}\
.optimizedCheckout-form-input::placeholder{color:#aaa!important;}\
/* buttons */\
.button--primary,button[type='submit'].button--primary,.optimizedCheckout-buttonPrimary{background:transparent!important;color:var(--dbc-accent)!important;border:1px solid var(--dbc-accent)!important;font-weight:700!important;text-transform:none!important;}\
.button--primary:hover{filter:brightness(1.1);}\
.button--secondary,.optimizedCheckout-buttonSecondary{background:transparent!important;border:1px solid #666!important;color:#ddd!important;}\
/* links */\
a,.optimizedCheckout-contentPrimary a{color:var(--dbc-accent)!important;}\
/* order summary */\
.optimizedCheckout-orderSummary .cart-priceItem,.optimizedCheckout-orderSummary .cart-priceItem-value,.optimizedCheckout-orderSummary .cart-priceItem-label{color:var(--dbc-text)!important;}\
/* errors */\
.optimizedCheckout-form-input.is-invalid,.form-field--error .optimizedCheckout-form-input{border-color:#d66!important;}\
.alertBox-message,.form-inlineMessage{color:#f4c2c2!important;}\
/* optional: hide 'continue shopping' or cart links that bounce out */\
.checkoutHeader .header-continueShopping,.cart-modal-link{display:none!important;}\
";
    var el = document.createElement('style');
    el.type = 'text/css';
    el.appendChild(document.createTextNode(css));
    document.head.appendChild(el);

    /* ========= 2) LOGO LINK PATCH =========
       - Change the logo to go to your domain (or disable it entirely).
       - If you prefer to DISABLE, set WANT_DISABLE_LOGO = true.
    */
    var WANT_DISABLE_LOGO = false; // set true to make logo unclickable
    var TARGET_URL = "https://dirtybastardscollective.com/"; // where you want the logo to go

    function patchLogoLink() {
      try {
        // try a few likely selectors BigCommerce uses on checkout
        var candidates = [].slice.call(document.querySelectorAll(
          ".checkoutHeader a, .header-logo a, a.header-logo__link, .logo a, .header-logo-link, .checkoutHeader-logo a"
        ));
        // fallback: any top-left anchor with an img
        if (!candidates.length) {
          candidates = [].slice.call(document.querySelectorAll("a[href] img")).map(function(img){ return img.closest("a"); }).filter(Boolean);
        }
        var a = candidates.find(Boolean);
        if (!a) return;

        if (WANT_DISABLE_LOGO) {
          a.removeAttribute("href");
          a.style.pointerEvents = "none";
          a.style.cursor = "default";
          return;
        }

        a.setAttribute("href", TARGET_URL);
        a.setAttribute("target", "_self");
        a.setAttribute("rel", "noopener");
      } catch (e) {
        console.warn("DBC: logo patch failed", e);
      }
    }

    // run once DOM is ready, and again after React re-renders
    var ready = (document.readyState === "interactive" || document.readyState === "complete");
    if (ready) patchLogoLink(); else document.addEventListener("DOMContentLoaded", patchLogoLink);
    // retry a couple times to survive SPA transitions
    setTimeout(patchLogoLink, 800);
    setTimeout(patchLogoLink, 1800);
  } catch (e) {
    console.error('DBC checkout CSS/JS inject failed', e);
  }
})();
