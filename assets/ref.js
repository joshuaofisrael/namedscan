// NamedScan referral and campaign attribution.
// A visit with ?ref=CODE stores CODE for 90 days (localStorage + ns_ref cookie).
// A visit with utm_*, gclid, or fbclid stores those values for 90 days (localStorage + ns_attr cookie).
// Stripe client_reference_id is the creator ref when one is stored.
// With no ref and a paid source, it is a compact id such as ads_google_local.
(function () {
  var DAYS = 90, MS = DAYS * 864e5, REF_KEY = "ns_ref", ATTR_KEY = "ns_attr";
  var REF_RE = /^[A-Z0-9_]{2,40}$/;
  var ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
  var PAID_MEDIUM = { cpc: 1, ppc: 1, paid: 1, paidsocial: 1, paid_social: 1, display: 1, cpm: 1, cpv: 1 };
  var PAID_SOURCE = { google: 1, googleads: 1, adwords: 1, meta: 1, facebook: 1, fb: 1, instagram: 1, ig: 1 };
  var SOURCE_ALIAS = { googleads: "google", adwords: "google", google_ads: "google", facebook: "meta", fb: "meta", instagram: "meta", ig: "meta" };

  function params() {
    try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); }
  }
  function cookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  function writeCookie(name, value, ts) {
    var left = Math.max(1, Math.floor((ts + MS - Date.now()) / 1000));
    document.cookie = name + "=" + encodeURIComponent(value) + "; Max-Age=" + left + "; Path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  }
  function cleanRef(v) { v = String(v || "").trim().toUpperCase(); return REF_RE.test(v) ? v : ""; }
  function loadJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }
  function fresh(rec) { return !!(rec && rec.ts && Date.now() - rec.ts < MS); }

  var q = params();
  var fromRef = cleanRef(q.get("ref"));
  var savedRef = loadJson(REF_KEY);
  if (fromRef) {
    var refRec = { code: fromRef, ts: Date.now() };
    try { localStorage.setItem(REF_KEY, JSON.stringify(refRec)); } catch (e) {}
    writeCookie(REF_KEY, fromRef, refRec.ts);
  } else if (!fresh(savedRef) || !cleanRef(savedRef && savedRef.code)) {
    fromRef = "";
    if (savedRef) { try { localStorage.removeItem(REF_KEY); } catch (e) {} }
    fromRef = cleanRef(cookie(REF_KEY));
  } else fromRef = cleanRef(savedRef.code);
  window.NS_REF = fromRef || null;

  function clip(v) { return String(v || "").trim().slice(0, 120); }
  function fromQuery() {
    var data = {}, any = false;
    ATTR_KEYS.forEach(function (k) { var v = clip(q.get(k)); if (v) { data[k] = v; any = true; } });
    return any ? data : null;
  }
  function readAttr() {
    var rec = loadJson(ATTR_KEY);
    if (fresh(rec) && rec.data) return rec.data;
    if (rec) { try { localStorage.removeItem(ATTR_KEY); } catch (e) {} }
    try {
      var raw = JSON.parse(cookie(ATTR_KEY) || "null");
      if (raw && raw.ts && Date.now() - raw.ts < MS && raw.data) return raw.data;
    } catch (e) {}
    return null;
  }
  var queryAttr = fromQuery();
  var attr = queryAttr;
  if (queryAttr) {
    var attrRec = { ts: Date.now(), data: queryAttr };
    try { localStorage.setItem(ATTR_KEY, JSON.stringify(attrRec)); } catch (e) {}
    writeCookie(ATTR_KEY, JSON.stringify(attrRec), attrRec.ts);
  } else attr = readAttr();
  window.NS_ATTR = attr || {};

  function slug(v) {
    return String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_").slice(0, 40);
  }
  function isPaid(a) {
    if (!a) return false;
    if (a.gclid || a.fbclid) return true;
    if (PAID_MEDIUM[String(a.utm_medium || "").toLowerCase()]) return true;
    return !!(a.utm_campaign && PAID_SOURCE[String(a.utm_source || "").toLowerCase()]);
  }
  function adsRef(a) {
    if (!isPaid(a)) return "";
    var src = slug(a.utm_source);
    if (SOURCE_ALIAS[src]) src = SOURCE_ALIAS[src];
    if (!src && a.gclid) src = "google";
    if (!src && a.fbclid) src = "meta";
    var camp = slug(a.utm_campaign);
    var id = "ads" + (src ? "_" + src : "") + (camp ? "_" + camp : "");
    if (id === "ads") id = "ads_paid";
    return id.slice(0, 200);
  }
  window.NS_ADS_REF = adsRef(window.NS_ATTR);
  window.nsClientReference = function () { return window.NS_REF || window.NS_ADS_REF || ""; };

  function tag(a) {
    var id = window.nsClientReference();
    if (!id || !a || !a.href || a.href.indexOf("https://buy.stripe.com/") !== 0) return;
    try {
      var u = new URL(a.href);
      if (!u.searchParams.get("client_reference_id")) { u.searchParams.set("client_reference_id", id); a.href = u.toString(); }
    } catch (e) {}
  }
  function tagAll() { Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://buy.stripe.com/"]'), tag); }
  document.addEventListener("click", function (e) { var a = e.target && e.target.closest ? e.target.closest("a") : null; tag(a); }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tagAll); else tagAll();
})();
