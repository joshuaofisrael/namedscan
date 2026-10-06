// Loads Google and Meta tags only when js/tracking-config.js has an id.
// Events: generate_lead / Lead, begin_checkout / InitiateCheckout, purchase / Purchase.
(function () {
  var cfg = window.NS_TRACK || {};
  var VALUES = { single_report: 5, starter_management: 199, done_for_you: 300, growth_management: 500 };
  function filled(v) { return String(v || "").trim(); }
  var ga4 = filled(cfg.GA4_ID);
  var ads = filled(cfg.GOOGLE_ADS_ID);
  var previewLabel = filled(cfg.GOOGLE_ADS_PREVIEW_LABEL);
  var purchaseLabel = filled(cfg.GOOGLE_ADS_PURCHASE_LABEL);
  var pixel = filled(cfg.META_PIXEL_ID);

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-booking]"), function (a) {
      if (cfg.BOOKING_URL) a.href = cfg.BOOKING_URL;
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  function loadGtag() {
    if (window.gtag || (!ga4 && !ads)) return;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga4 || ads);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    if (ga4) window.gtag("config", ga4);
    if (ads) window.gtag("config", ads);
  }
  function loadPixel() {
    if (!pixel || window.fbq) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", pixel);
    window.fbq("track", "PageView");
  }
  loadGtag();
  loadPixel();

  function planValue(plan) { return Object.prototype.hasOwnProperty.call(VALUES, plan) ? VALUES[plan] : null; }

  window.nsTrackLead = function () {
    if (window.gtag && ga4) window.gtag("event", "generate_lead");
    if (window.gtag && ads && previewLabel) window.gtag("event", "conversion", { send_to: ads + "/" + previewLabel });
    if (window.fbq && pixel) window.fbq("track", "Lead");
  };

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a || !a.href || a.href.indexOf("https://buy.stripe.com/") !== 0) return;
    var plan = a.getAttribute("data-plan") || "";
    var value = planValue(plan);
    var params = { currency: "USD" };
    if (value !== null) params.value = value;
    if (plan) params.plan = plan;
    if (window.gtag && (ga4 || ads)) window.gtag("event", "begin_checkout", params);
    if (window.fbq && pixel) {
      var meta = { currency: "USD" };
      if (value !== null) meta.value = value;
      if (plan) meta.content_name = plan;
      window.fbq("track", "InitiateCheckout", meta);
    }
  }, true);

  function trackPurchase() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var sid = q.get("session_id") || "";
    var plan = q.get("plan") || "";
    var value = planValue(plan);
    if (!/^cs_(live|test)_/.test(sid) || value === null) return;
    if (!((window.gtag && (ga4 || ads)) || (window.fbq && pixel))) return;
    var key = "ns_purchase_" + sid;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch (e) { return; }
    if (window.gtag && (ga4 || ads)) window.gtag("event", "purchase", { transaction_id: sid, value: value, currency: "USD", plan: plan });
    if (window.gtag && ads && purchaseLabel) window.gtag("event", "conversion", { send_to: ads + "/" + purchaseLabel, transaction_id: sid, value: value, currency: "USD" });
    if (window.fbq && pixel) window.fbq("track", "Purchase", { value: value, currency: "USD", content_name: plan }, { eventID: sid });
  }
  if (/thanks\.html$/i.test(location.pathname)) trackPurchase();
})();
