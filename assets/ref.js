// NamedScan partner referral tracking.
// Rule: a visit with ?ref=CODE (any page) stores CODE for 90 days in localStorage and a first party cookie (ns_ref).
// Visits without ?ref keep the stored code. A new ?ref link replaces the stored code and restarts the 90 day window.
// Every Stripe checkout link on the page gets client_reference_id=CODE added (existing URL params are kept).
(function () {
  var KEY = "ns_ref", DAYS = 90, MS = DAYS * 864e5, RE = /^[A-Z0-9_]{2,40}$/;
  function clean(v) { v = String(v || "").trim().toUpperCase(); return RE.test(v) ? v : null; }
  function readCookie() { var m = document.cookie.match(/(?:^|;\s*)ns_ref=([^;]+)/); return m ? decodeURIComponent(m[1]) : null; }
  function save(code, ts) {
    try { localStorage.setItem(KEY, JSON.stringify({ code: code, ts: ts })); } catch (e) {}
    var left = Math.max(1, Math.floor((ts + MS - Date.now()) / 1000));
    document.cookie = KEY + "=" + encodeURIComponent(code) + "; Max-Age=" + left + "; Path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  }
  function stored() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (s && clean(s.code) && s.ts && Date.now() - s.ts < MS) return clean(s.code);
    if (s) { try { localStorage.removeItem(KEY); } catch (e) {} }
    return clean(readCookie()); // the cookie expires on its own after 90 days
  }
  var fromUrl = null;
  try { fromUrl = clean(new URLSearchParams(location.search).get("ref")); } catch (e) {}
  if (fromUrl) save(fromUrl, Date.now());
  var code = fromUrl || stored();
  window.NS_REF = code || null;
  if (!code) return;
  function tag(a) {
    if (!a || !a.href || a.href.indexOf("https://buy.stripe.com/") !== 0) return;
    try {
      var u = new URL(a.href);
      if (!u.searchParams.get("client_reference_id")) { u.searchParams.set("client_reference_id", code); a.href = u.toString(); }
    } catch (e) {}
  }
  function tagAll() { Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://buy.stripe.com/"]'), tag); }
  // links added later (for example the upgrade button inside a report) are tagged at click time
  document.addEventListener("click", function (e) { var a = e.target && e.target.closest ? e.target.closest("a") : null; tag(a); }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tagAll); else tagAll();
})();
