(function () {
  try {
    var css = "\
:root{--dbc-accent:#f0783d;--dbc-text:#ffffff;--dbc-bg:#0b0c0d;}\
body.optimizedCheckout-body{background:var(--dbc-bg)!important;color:var(--dbc-text)!important;font-family:'Roboto Mono', monospace!important;}\
.optimizedCheckout-headingPrimary,.optimizedCheckout-headingSecondary,.optimizedCheckout-contentPrimary h1,.optimizedCheckout-contentPrimary h2,.optimizedCheckout-contentPrimary h3{color:var(--dbc-text)!important;font-family:'Roboto Mono', monospace!important;}\
.optimizedCheckout-contentPrimary,.optimizedCheckout-form-input,.optimizedCheckout-form-label{color:var(--dbc-text)!important;font-family:'Roboto Mono', monospace!important;}\
.optimizedCheckout-contentPrimary .form-legend,.optimizedCheckout-contentPrimary .form-body,.optimizedCheckout-orderSummary,.checkout-view-header,.layout{background:transparent!important;}\
.optimizedCheckout-form-input{background:#1a1c1f!important;border-color:#333!important;color:var(--dbc-text)!important;}\
.optimizedCheckout-form-input::placeholder{color:#aaa!important;}\
.button--primary,button[type='submit'].button--primary,.optimizedCheckout-buttonPrimary{background:transparent!important;color:var(--dbc-accent)!important;border:1px solid var(--dbc-accent)!important;font-weight:700!important;text-transform:none!important;}\
.button--primary:hover{filter:brightness(1.1);}\
.button--secondary,.optimizedCheckout-buttonSecondary{background:transparent!important;border:1px solid #666!important;color:#ddd!important;}\
a,.optimizedCheckout-contentPrimary a{color:var(--dbc-accent)!important;}\
.checkoutHeader .header-continueShopping,.cart-modal-link,.optimizedCheckout-orderSummary .cart-link{display:none!important;}\
.optimizedCheckout-orderSummary .cart-priceItem,.optimizedCheckout-orderSummary .cart-priceItem-value,.optimizedCheckout-orderSummary .cart-priceItem-label{color:var(--dbc-text)!important;}\
.optimizedCheckout-form-input.is-invalid,.form-field--error .optimizedCheckout-form-input{border-color:#d66!important;}\
.alertBox-message,.form-inlineMessage{color:#f4c2c2!important;}\
";
    var el = document.createElement('style');
    el.type = 'text/css';
    el.appendChild(document.createTextNode(css));
    document.head.appendChild(el);
  } catch (e) {
    console.error('DBC checkout CSS inject failed', e);
  }
})();
