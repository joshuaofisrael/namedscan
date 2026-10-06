// Free scan and subscriber scan form. Talks to the NamedScan API; no keys or secrets in this file.
(function () {
  var f = document.getElementById("scanform");
  if (!f) return;
  var out = document.getElementById("scan-result");
  var status = document.getElementById("scan-status");
  var btn = f.querySelector("button[type=submit]");
  var keyInput = f.querySelector("[name=access_key]");
  try {
    var saved = JSON.parse(localStorage.getItem("namedscan_sub") || "null");
    if (saved && saved.access_key) { keyInput.value = saved.access_key; f.querySelector("[name=email]").value = saved.email || ""; document.getElementById("subbox").open = true; }
  } catch (e) {}
  fetch(NS_API + "/api/status").then(function (r) { return r.json(); }).then(function (s) {
    var n = document.getElementById("scan-live-note");
    if (n && s && s.free_left_today === 0) n.textContent = "Today's free previews are all taken. Please come back tomorrow.";
  }).catch(function () {});

  var idleLabel = btn.textContent;
  function say(msg, kind) { status.hidden = false; status.className = "scanstatus " + (kind || ""); status.textContent = msg; }
  function setBusy(b) { btn.disabled = b; btn.textContent = b ? "Scanning..." : idleLabel; }
  function showCallout(report) {
    var box = document.getElementById("preview-callout");
    if (!box || !report) return;
    var s = report.summary || {};
    var answered = typeof s.answered === "number" ? s.answered : null;
    var parts = [];
    if (typeof s.mentions === "number" && answered) parts.push("Named in " + s.mentions + " of " + answered + " questions");
    var comps = Array.isArray(report.competitors) ? report.competitors : [];
    var named = {};
    comps.forEach(function (c) {
      if (!c || !c.name) return;
      named[c.name] = 1;
      if (typeof c.answers === "number" && answered) parts.push(c.name + " named in " + c.answers + " of " + answered);
      else parts.push(c.name + " was named");
    });
    if (report.top_competitor && !named[report.top_competitor]) parts.push(report.top_competitor + " was named");
    else if (!comps.length && !report.top_competitor && typeof report.competitors_found === "number" && report.competitors_found > 0) parts.push(report.competitors_found + (report.competitors_found === 1 ? " other was named" : " others were named"));
    if (parts.length < 1 || (parts.length === 1 && parts[0].indexOf("Named in ") === 0 && !report.top_competitor && !comps.length && !(report.competitors_found > 0))) {
      box.hidden = true; box.textContent = ""; return;
    }
    box.hidden = false;
    box.textContent = parts.join("; ");
  }

  var retries = 0;
  function run(payload) {
    setBusy(true);
    say(payload.access_key ? "Starting your full scan. Asking ChatGPT 15 customer questions with live web search takes about one to two minutes." : "Asking ChatGPT three customer questions with live web search and checking your website. This takes about 20 to 60 seconds.");
    fetch(NS_API + "/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(function (res) {
      var ct = res.headers.get("Content-Type") || "";
      if (ct.indexOf("ndjson") >= 0 && res.body) return readStream(res.body.getReader(), payload);
      return res.json().then(function (j) { handle(j, payload); });
    }).catch(function () { setBusy(false); say("We could not reach the scanner. Please check your connection and try again.", "bad"); });
  }
  function readStream(reader, payload) {
    var dec = new TextDecoder(), buf = "";
    function pump() {
      return reader.read().then(function (x) {
        if (x.done) { if (buf.trim()) { try { handle(JSON.parse(buf), payload); } catch (e) {} } setBusy(false); return; }
        buf += dec.decode(x.value, { stream: true });
        var lines = buf.split("\n"); buf = lines.pop();
        lines.forEach(function (ln) { if (!ln.trim()) return; try { handle(JSON.parse(ln), payload); } catch (e) {} });
        return pump();
      });
    }
    return pump();
  }
  function handle(m, payload) {
    if (m.type === "progress") { say("Asking ChatGPT customer questions: " + m.done + " of " + m.total + " answered."); return; }
    if (m.type === "started") return;
    if (m.type === "result" && m.report) {
      setBusy(false); retries = 0;
      var pre = m.report.mode === "teaser" ? "Your free preview is ready." : m.report.teaser_unavailable ? "Your free website check is ready." : "Your report is ready.";
      say(m.cached ? pre + " It comes from a check of this business in the last 24 hours." : pre, "ok");
      m.report._email = payload.email;
      showCallout(m.report);
      nsRenderReport(out, m.report);
      if (!payload.access_key && window.nsTrackLead) window.nsTrackLead();
      var callout = document.getElementById("preview-callout");
      (callout && !callout.hidden ? callout : out).scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (m.reason === "busy" && retries < 12) {
      retries++;
      var wait = m.retry_after_s || 20;
      say(nsNodash(m.message || "Several scans are running.") + " Retrying in " + wait + " seconds.");
      setTimeout(function () { run(payload); }, wait * 1000);
      return;
    }
    setBusy(false);
    say(nsNodash(m.message || "Something went wrong. Please try again."), "bad");
  }

  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(f);
    var p = {};
    ["name", "email", "business", "website", "city", "state", "category", "hp", "access_key"].forEach(function (k) { p[k] = (d.get(k) || "").toString().trim(); });
    var attr = window.NS_ATTR || {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach(function (k) { if (attr[k]) p[k] = attr[k]; });
    if (p.website && !/^https?:\/\//i.test(p.website)) p.website = "https://" + p.website;
    if (!p.access_key) delete p.access_key;
    retries = 0;
    run(p);
  });
})();
