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
    if (n && s && s.free_left_today === 0) n.textContent = "Today's free checks are all taken. Please come back tomorrow.";
  }).catch(function () {});

  function say(msg, kind) { status.hidden = false; status.className = "scanstatus " + (kind || ""); status.textContent = msg; }
  function setBusy(b) { btn.disabled = b; btn.textContent = b ? "Scanning..." : "Run my scan"; }

  var retries = 0;
  function run(payload) {
    setBusy(true);
    say(payload.access_key ? "Starting your full scan. Asking ChatGPT 15 customer questions with live web search takes about one to two minutes." : "Checking your website. This takes about 10 to 20 seconds.");
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
      say(m.cached ? "Here is your report (from a scan of this business in the last 24 hours)." : "Your report is ready.", "ok");
      nsRenderReport(out, m.report);
      out.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (p.website && !/^https?:\/\//i.test(p.website)) p.website = "https://" + p.website;
    if (!p.access_key) delete p.access_key;
    retries = 0;
    run(p);
  });
})();
