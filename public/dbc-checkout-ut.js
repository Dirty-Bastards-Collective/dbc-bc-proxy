// dbc-checkout-ui.js
(() => {
  // Minimal visual alignment with your brand (fonts/colors only)
  const css = `
    :root {
      --dbc-accent: #f0783d;
      --dbc-text: #ffffff;
      --dbc-muted: #bbbbbb;
    }
    body, h1, h2, h3, p, a, button, input, select, textarea {
      font-family: 'Roboto Mono', monospace !important;
    }
    .button, button, [type="submit"] {
      border-color: var(--dbc-accent) !important;
      color: var(--dbc-accent) !important;
      background: transparent !important;
    }
    .optimizedCheckout-contentPrimary, .optimizedCheckout-form {
      color: var(--dbc-text) !important;
    }
    /* thin borders to match your vibe */
    .form-field, .form-input, .form-select, .cart-section {
      border-color: rgba(255,255,255,.15) !important;
    }
    /* optional: disable header logo link so people don’t jump away mid-checkout */
    header a[href*="/"] {
      pointer-events: none !important;
      cursor: default !important;
    }
  `;
  const style = document.createElement('style');
  style.setAttribute('data-dbc', 'checkout-ui');
  style.appendChild(document.createTextNode(css));
  document.documentElement.appendChild(style);
})();
