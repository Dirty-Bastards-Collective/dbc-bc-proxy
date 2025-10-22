(function () {
  try {
    var css = [
      "/* --- DBC lightweight checkout polish --- */",
      ":root{--dbc-accent:#f0783d;--dbc-text:#ffffff;--dbc-muted:#bbb;--dbc-bg:#121111;--dbc-font:'Roboto Mono',monospace;}",
      ".optimizedCheckout-contentPrimary,.optimizedCheckout-headingPrimary,.optimizedCheckout-form-label,.optimizedCheckout-orderSummary,.checkout-step{font-family:var(--dbc-font)!important;}",
      ".optimizedCheckout-buttonPrimary,.button--primary{background:transparent!important;color:var(--dbc-accent)!important;border:1px solid var(--dbc-accent)!important;box-shadow:none!important;border-radius:0!important;text-transform:none!important;font-family:var(--dbc-font)!important;}",
      ".optimizedCheckout-buttonPrimary:hover,.button--primary:hover{filter:brightness(1.1)!important;}",
      ".button,.optimizedCheckout-buttonSecondary,.stepHeader-counter{font-family:var(--dbc-font)!important;}",
      ".optimizedCheckout-header,.optimizedCheckout-headingPrimary,.optimizedCheckout-step{color:var(--dbc-text)!important;}",
      ".optimizedCheckout-orderSummary{border-color:rgba(255,255,255,0.15)!important;}",
      ".optimizedCheckout-orderSummary .cart-priceItem-value,.optimizedCheckout-orderSummary .cart-total{color:var(--dbc-accent)!important;font-family:var(--dbc-font)!important;}",
      ".optimizedCheckout-form-label--secondary,.optimizedCheckout-contentSecondary{color:var(--dbc-muted)!important;}"
    ].join("");

    var style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);

    // Load Roboto Mono if not present
    var font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap";
    document.head.appendChild(font);

    console.log("DBC checkout CSS injected");
  } catch (e) {
    console.error("DBC checkout CSS inject failed", e);
  }
})();
