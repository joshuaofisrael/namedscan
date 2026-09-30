document.getElementById("yr") && (document.getElementById("yr").textContent = new Date().getFullYear());
// Results section stays hidden unless data/results.json is marked verified and has real items.
fetch("data/results.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
  if (!j || j.verified !== true || !Array.isArray(j.items) || !j.items.length) return;
  var list = document.getElementById("results-list");
  if (!list) return;
  j.items.forEach(function (it) {
    var c = document.createElement("div"); c.className = "card";
    var h = document.createElement("h3"); h.textContent = it.label || "";
    var p = document.createElement("p"); p.textContent = (it.value || "") + (it.evidence ? " (" + it.evidence + ")" : "");
    c.appendChild(h); c.appendChild(p); list.appendChild(c);
  });
  if (j.as_of) document.getElementById("results-asof").textContent = "Verified as of " + j.as_of + ".";
  document.querySelector("[data-results-section]").hidden = false;
}).catch(function () {});
