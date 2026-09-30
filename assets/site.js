// Lead form: builds a readable email in the visitor's mail app (no backend needed).
// To switch to Formspree later, set FORMSPREE_ID and the form posts there instead.
var FORMSPREE_ID = "";
document.getElementById("yr").textContent = new Date().getFullYear();
var f = document.getElementById("lead");
if (f) f.addEventListener("submit", function (e) {
  var d = new FormData(f);
  if (FORMSPREE_ID) { f.action = "https://formspree.io/f/" + FORMSPREE_ID; f.method = "post"; f.enctype = "application/x-www-form-urlencoded"; return; }
  e.preventDefault();
  var lines = [];
  d.forEach(function (v, k) { lines.push(k + ": " + v); });
  var subj = "NamedScan request: " + (d.get("interest") || "Free scan") + ", " + (d.get("business") || "");
  location.href = "mailto:joshuaofisrael@gmail.com?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(lines.join("\n"));
});
// Results section stays hidden unless data/results.json is marked verified and has real items.
fetch("data/results.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
  if (!j || j.verified !== true || !Array.isArray(j.items) || !j.items.length) return;
  var list = document.getElementById("results-list");
  j.items.forEach(function (it) {
    var c = document.createElement("div"); c.className = "card";
    var h = document.createElement("h3"); h.textContent = it.label || "";
    var p = document.createElement("p"); p.textContent = (it.value || "") + (it.evidence ? " (" + it.evidence + ")" : "");
    c.appendChild(h); c.appendChild(p); list.appendChild(c);
  });
  if (j.as_of) document.getElementById("results-asof").textContent = "Verified as of " + j.as_of + ".";
  document.querySelector("[data-results-section]").hidden = false;
}).catch(function () {});
