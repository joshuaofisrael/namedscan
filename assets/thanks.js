// Thank you page: turns the Stripe checkout session into an access key and shows the first report when it is ready.
window.addEventListener("DOMContentLoaded", function () {
  var q = new URLSearchParams(location.search), sid = q.get("session_id") || "", plan = q.get("plan") || "";
  var st = document.getElementById("thanks-status");
  if (plan === "done_for_you") { document.getElementById("dfy-note").hidden = false; document.getElementById("plan-line").textContent = "Thank you for choosing NamedScan Done For You. Your payment was handled securely by Stripe, and a receipt is on its way from Stripe."; }
  function say(m, k) { st.className = "scanstatus " + (k || ""); st.textContent = m; }
  if (!/^cs_(live|test)_/.test(sid)) { say("Your payment went through. Your access key and report will be emailed to you.", "ok"); return; }
  var tries = 0;
  function activate() {
    fetch(NS_API + "/api/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sid }) })
      .then(function (r) { return r.json(); }).then(function (j) {
        if (j.ok) {
          localStorage.setItem("namedscan_sub", JSON.stringify({ email: j.email, access_key: j.access_key }));
          document.getElementById("key-email").textContent = j.email;
          document.getElementById("key-value").textContent = j.access_key;
          document.getElementById("key-card").hidden = false;
          say("Payment confirmed. Your first full report is being prepared.", "ok");
          pollOrder();
        } else if (j.pending && tries < 20) { tries++; setTimeout(activate, 4000); }
        else if (j.pending) { say("Your payment went through, and we are still confirming it on our side. Your access key and first report will be emailed to you.", "ok"); }
        else { say(nsNodash(j.message || "We could not show your access key here.") + " Your access key and report will be emailed to you.", "bad"); pollOrder(); }
      }).catch(function () { if (tries++ < 20) setTimeout(activate, 4000); });
  }
  var polls = 0;
  function pollOrder() {
    fetch(NS_API + "/api/order?session_id=" + encodeURIComponent(sid)).then(function (r) { return r.json(); }).then(function (j) {
      if (j.ok && j.status === "done" && j.report_url) {
        say("Your first report is ready." + (j.emailed ? " We also emailed you the link." : ""), "ok");
        var u = new URL(j.report_url);
        fetch(NS_API + "/api/report" + u.search).then(function (r) { return r.json(); }).then(function (x) { if (x.ok) { x.report.report_url = j.report_url; nsRenderReport(document.getElementById("scan-result"), x.report); } });
        return;
      }
      if (j.ok && j.status === "needs_info") { say("Payment confirmed. We need your website, city and business type to run your first report. Use the scan form with your access key, or reply to the email we send you.", "ok"); return; }
      if (polls++ < 60) { if (j.ok && j.status !== "queued" && j.status !== "running") {} else say("Payment confirmed. Your first full report is being prepared, and it will be emailed to you when it is ready.", "ok"); setTimeout(pollOrder, 10000); }
      else say("Your report is taking a little longer. It will be emailed to you as soon as it is ready.", "ok");
    }).catch(function () { if (polls++ < 60) setTimeout(pollOrder, 10000); });
  }
  activate();
});
