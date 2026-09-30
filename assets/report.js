// NamedScan report rendering (on page) and branded PDF (jsPDF, generated in the browser). No secrets here.
var NS_API = "https://namedscan-api.joshofisrael.workers.dev";
var NS_LINKS = { self_serve: "https://buy.stripe.com/bJe8wQ9Us2ZXggfc2sb3q1p", done_for_you: "https://buy.stripe.com/8x2fZi8QofMJaVV8Qgb3q1q" };

function nsNodash(s) {
  s = String(s == null ? "" : s);
  s = s.replace(/\b(\d{3})[\-\u2010-\u2013](\d{3})[\-\u2010-\u2013](\d{4})\b/g, "$1 $2 $3").replace(/([A-Za-z])\u2013([A-Za-z])/g, "$1 to $2");
  s = s.replace(/\s[\u2010-\u2015\u2212]\s/g, ", ").replace(/[\u2010-\u2015\u2212]/g, " ").replace(/ - /g, ", ").replace(/(\d)\s*-\s*(\d)/g, "$1 to $2");
  s = s.split(" ").map(function (t) { return (t.indexOf("-") >= 0 && !/^[\w.\-\/:]+\.[a-z]{2,}(\/[\w.\-\/]*)?$/i.test(t.replace(/^[.,;:()]+|[.,;:()]+$/g, ""))) ? t.replace(/-/g, " ") : t; }).join(" ");
  return s.replace(/ {2,}/g, " ").trim();
}
function nsEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function nsT(s) { return nsEsc(nsNodash(s)); }
function nsDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); if (!m) return d || ""; return parseInt(m[3], 10) + " " + ["January","February","March","April","May","June","July","August","September","October","November","December"][parseInt(m[2], 10) - 1] + " " + m[1]; }
function nsPct(v) { return Math.round((v || 0) * 100) + "%"; }

function nsRenderReport(el, r) {
  var live = r.mode === "live" || r.mode === "sample";
  var isFree = r.plan === "free";
  var sc = r.score || { score: 0, band: "Low" };
  var color = sc.score >= 75 ? "var(--ok)" : sc.score >= 50 ? "var(--teal2)" : sc.score >= 25 ? "var(--warn)" : "var(--bad)";
  var modeLabel = r.mode === "sample" ? "Sample data for testing" : r.mode === "live" ? "Live ChatGPT scan with web search" : "Free website AI readiness check";
  var h = [];
  h.push('<div class="paper result">');
  if (r.mode === "sample") h.push('<span class="stamp">SAMPLE DATA</span>');
  h.push('<h3 style="margin:0;color:var(--navy)">' + nsT(r.business.name) + '</h3>');
  h.push('<div class="meta">' + nsT(r.business.city + ", " + r.business.state) + " | " + nsT(r.business.category) + " | " + nsT(nsDate(r.date)) + " | " + nsT(modeLabel) + '</div>');
  h.push('<div class="score"><div class="ring" style="background:conic-gradient(' + color + ' 0 ' + sc.score + '%,#eceff4 ' + sc.score + '% 100%)"><span>' + sc.score + '</span></div><div><strong>' +
    (live ? "AI visibility score" : "Website AI readiness") + ": " + sc.score + " of 100 (" + nsT(sc.band) + ")</strong><br><span class=\"note\">" +
    (live ? "Named in " + r.summary.mentions + " of " + r.summary.answered + " customer questions asked to ChatGPT" + (r.summary.best_position ? ", best list position " + r.summary.best_position : "") +
      ", website cited in " + r.summary.cited + " answers, share of voice " + nsPct(r.summary.share_of_voice) + "."
      : "How ready your website is for AI assistants to read, trust and cite.") + "</span></div></div>");
  if (!live) {
    h.push('<p class="note">This free check reads your website the way AI crawlers do. The full NamedScan report also asks ChatGPT, with live web search, the ' + (r.prompts || []).length +
      ' customer questions listed below and records whether your business is named and who is named instead. Self Serve subscribers get full reports instantly.</p>');
  }
  var fixes = r.fixes || [];
  var shown = isFree ? fixes.slice(0, 3) : fixes;
  if (shown.length) {
    h.push('<h4 style="margin:18px 0 6px">' + (isFree ? "Top fixes" : "Fix list") + '</h4><ol class="list">');
    shown.forEach(function (f) { h.push('<li><strong>' + nsT(f.title) + '</strong> <span class="pill ' + (f.priority === "High" ? "no" : f.priority === "Medium" ? "mid" : "ok") + '">' + nsT(f.priority) + '</span><br>' + nsT(f.detail) + '</li>'); });
    h.push('</ol>');
    if (isFree && fixes.length > 3) h.push('<p class="note">' + (fixes.length - 3) + ' more fixes are in the full report.</p>');
  }
  if (live && r.competitors && r.competitors.length) {
    h.push('<h4 style="margin:18px 0 6px">Named instead of you most often</h4><ol class="list">');
    r.competitors.slice(0, 5).forEach(function (c) { h.push('<li>' + nsT(c.name) + ' (' + c.answers + ' answers)</li>'); });
    h.push('</ol>');
  }
  h.push('<h4 style="margin:18px 0 6px">' + (live ? "Questions we asked" : "Questions the full scan asks") + '</h4><div class="tablewrap"><table><thead><tr><th>#</th><th>Customer question</th>' + (live ? '<th>Result</th><th>Named instead</th>' : '') + '</tr></thead><tbody>');
  (r.prompts || []).forEach(function (p) {
    var res = "";
    if (live) res = p.error ? '<span class="pill mid">No answer</span>' : p.mentioned ? '<span class="pill ok">Named' + (p.position ? " #" + p.position : "") + '</span>' : '<span class="pill no">Not named</span>';
    h.push('<tr><td>' + p.id + '</td><td>' + nsT(p.prompt) + '</td>' + (live ? '<td>' + res + '</td><td>' + nsT((p.competitors || []).slice(0, 3).join(", ")) + '</td>' : '') + '</tr>');
  });
  h.push('</tbody></table></div>');
  if (r.site && r.site.checks && r.site.checks.length) {
    h.push('<h4 style="margin:18px 0 6px">Website checks</h4><div class="tablewrap"><table><thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead><tbody>');
    r.site.checks.forEach(function (c) { h.push('<tr><td>' + nsT(c.label) + '</td><td><span class="pill ' + (c.status === "pass" ? "ok" : c.status === "warn" ? "mid" : "no") + '">' + (c.status === "pass" ? "Pass" : c.status === "warn" ? "Improve" : "Missing") + '</span></td><td>' + nsT(c.detail) + '</td></tr>'); });
    h.push('</tbody></table></div>');
  }
  h.push('<div class="cta" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px"><button class="btn" type="button" data-pdf>Download PDF report</button>' +
    (isFree ? '<a class="btn ghost" href="' + NS_LINKS.self_serve + '">Get full reports, $15/mo</a>' : '') + '</div>');
  if (r.report_url) h.push('<p class="note">Private link to this report: <a href="' + nsEsc(r.report_url) + '">' + nsEsc(r.report_url) + '</a></p>');
  h.push('<p class="note">AI answers change often, so this report is a dated snapshot. We work to improve and measure AI visibility; we do not promise or guarantee rankings or recommendations.</p>');
  h.push('</div>');
  el.innerHTML = h.join("");
  el.hidden = false;
  el.querySelector("[data-pdf]").addEventListener("click", function () { nsPdf(r); });
}

function nsPdfClean(s) {
  return nsNodash(s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u2026/g, "...").replace(/[^\x20-\x7e\xa0-\xff\n]/g, "");
}

function nsPdf(r) {
  var J = window.jspdf.jsPDF;
  var doc = new J({ unit: "pt", format: "letter" });
  var W = 612, H = 792, M = 48, y = 0;
  var NAVY = [15, 42, 74], TEAL = [20, 184, 166], MUTED = [91, 103, 120], INK = [27, 36, 48];
  var live = r.mode === "live" || r.mode === "sample";
  var isFree = r.plan === "free";
  function color(c) { doc.setTextColor(c[0], c[1], c[2]); }
  function text(s, x, yy, opt) { doc.text(nsPdfClean(s), x, yy, opt || {}); }
  function newPage() { doc.addPage(); y = M + 10; if (r.mode === "sample") stamp(); }
  function need(hh) { if (y + hh > H - 60) newPage(); }
  function stamp() { doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(146, 64, 14); doc.setFillColor(254, 243, 199); doc.roundedRect(W - M - 96, 18, 96, 20, 4, 4, "F"); doc.text("SAMPLE DATA", W - M - 48, 32, { align: "center" }); }
  function para(s, size, c, bold, indent) {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); color(c || INK);
    var lines = doc.splitTextToSize(nsPdfClean(s), W - 2 * M - (indent || 0));
    lines.forEach(function (ln) { need(size + 4); doc.text(ln, M + (indent || 0), y); y += size + 4; });
  }
  function heading(s) { need(40); y += 10; doc.setFont("helvetica", "bold"); doc.setFontSize(14); color(NAVY); text(s, M, y); y += 6; doc.setDrawColor(TEAL[0], TEAL[1], TEAL[2]); doc.setLineWidth(1.5); doc.line(M, y, M + 60, y); y += 16; }

  // header band
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(0, 0, W, 110, "F");
  doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]); doc.circle(M + 12, 44, 12, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255); text("NamedScan", M + 32, 52);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(214, 226, 240);
  text(live ? "AI Visibility Report" : "Website AI Readiness Report", M + 32, 70);
  text("namedscan.com | operated by Joshua Israel Ventures LLC", M + 32, 86);
  if (r.mode === "sample") stamp();
  y = 146;
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); color(NAVY); text(r.business.name, M, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); color(MUTED);
  text(r.business.website + " | " + r.business.city + ", " + r.business.state + " | " + r.business.category, M, y); y += 14;
  text("Report date " + nsDate(r.date) + " | " + (r.mode === "sample" ? "Sample data for testing, not a real scan" : live ? "ChatGPT (" + ((r.engine && r.engine.display) || "OpenAI with web search") + ")" : "Website check, no AI questions asked yet"), M, y); y += 26;

  // score block
  var sc = r.score || { score: 0, band: "Low" };
  var cx = M + 50, cy = y + 50;
  doc.setDrawColor(236, 239, 244); doc.setLineWidth(12); doc.circle(cx, cy, 40, "S");
  var sc2 = sc.score >= 75 ? [21, 128, 61] : sc.score >= 50 ? [13, 148, 136] : sc.score >= 25 ? [180, 83, 9] : [185, 28, 28];
  doc.setDrawColor(sc2[0], sc2[1], sc2[2]);
  var steps = Math.max(1, Math.round(sc.score * 0.72));
  for (var i = 0; i < steps; i++) { var a1 = -Math.PI / 2 + (i / 72) * 2 * Math.PI, a2 = -Math.PI / 2 + ((i + 1) / 72) * 2 * Math.PI; doc.line(cx + 40 * Math.cos(a1), cy + 40 * Math.sin(a1), cx + 40 * Math.cos(a2), cy + 40 * Math.sin(a2)); }
  doc.setLineWidth(1);
  doc.setFont("helvetica", "bold"); doc.setFontSize(26); color(NAVY); text(String(sc.score), cx, cy + 9, { align: "center" });
  doc.setFontSize(15); text((live ? "AI visibility score " : "Website AI readiness ") + sc.score + " of 100", M + 116, y + 34);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); color(MUTED);
  var sumLines = live ? ["Band: " + sc.band, "Named in " + r.summary.mentions + " of " + r.summary.answered + " customer questions" + (r.summary.best_position ? ", best list position " + r.summary.best_position : ""),
    "Website cited in " + r.summary.cited + " answers, share of voice " + nsPct(r.summary.share_of_voice)] :
    ["Band: " + sc.band, "Based on " + ((r.site && r.site.checks) || []).length + " checks of the homepage, robots.txt, llms.txt and sitemap"];
  sumLines.forEach(function (s, k) { text(s, M + 116, y + 52 + k * 15); });
  y += 118;

  if (live && sc.components) {
    heading("How the score is built");
    Object.keys(sc.components).forEach(function (k) { var c = sc.components[k]; para(c.label + ": " + nsPct(c.value) + " (worth " + c.weight + " points, earned " + c.points + ")", 10.5, INK, false); });
  }
  if (!live) {
    heading("What this free check covers");
    para("This check reads your website the way AI crawlers do: page title, description, structured data, name, address and phone, services, FAQ content, reviews, robots.txt rules for AI crawlers, llms.txt and sitemap. The full NamedScan report also asks ChatGPT, with live web search, the customer questions listed in this report and records whether your business is named, where it ranks and who is named instead.", 10.5, INK);
  }
  var fixes = r.fixes || [], shown = isFree ? fixes.slice(0, 3) : fixes;
  if (shown.length) {
    heading(isFree ? "Top fixes" : "Fix list, in priority order");
    shown.forEach(function (f, k) { para((k + 1) + ". " + f.title + " (" + f.priority + " priority)", 11, NAVY, true); para(f.detail, 10, MUTED, false, 14); y += 4; });
    if (isFree && fixes.length > 3) para(fixes.length - 3 + " more fixes are included in the full report (Self Serve, $15 a month, namedscan.com).", 10, TEAL, true);
  }
  if (live && r.competitors && r.competitors.length) {
    heading("Businesses named instead");
    r.competitors.slice(0, 8).forEach(function (c, k) { para((k + 1) + ". " + c.name + ": named in " + c.answers + " answers, average position " + c.avg_position, 10.5, INK); });
  }
  heading(live ? "Question by question results" : "Customer questions the full scan asks");
  (r.prompts || []).forEach(function (p) {
    var res = live ? (p.error ? "No answer returned" : p.mentioned ? "NAMED" + (p.position ? " at position " + p.position : "") : "Not named") : "";
    para(p.id + ". " + p.prompt, 10.5, NAVY, true);
    if (live) {
      para("Result: " + res + ((p.competitors || []).length ? " | Named instead: " + p.competitors.slice(0, 3).join(", ") : ""), 9.5, INK, false, 14);
      if (p.snippet) para("Answer excerpt: " + p.snippet, 8.5, MUTED, false, 14);
      if ((p.sources || []).length) para("Sources cited: " + p.sources.slice(0, 5).join(", "), 8.5, MUTED, false, 14);
    }
    y += 3;
  });
  if (live && r.sources && r.sources.length) { heading("Sources the answers relied on"); para(r.sources.slice(0, 12).map(function (s) { return s.domain + " (" + s.answers + ")"; }).join(", "), 10, INK); }
  if (r.site && r.site.checks && r.site.checks.length) {
    heading("Website checks");
    r.site.checks.forEach(function (c) { para((c.status === "pass" ? "PASS  " : c.status === "warn" ? "IMPROVE  " : "MISSING  ") + c.label, 10.5, c.status === "pass" ? [21, 128, 61] : c.status === "warn" ? [180, 83, 9] : [185, 28, 28], true); para(c.detail, 9.5, MUTED, false, 14); });
  }
  heading("About this report");
  para("AI answers change often and vary from one ask to the next, so this report is a dated snapshot of the answers collected on " + nsDate(r.date) + ". The score weighs how often and how prominently the business is named, share of voice against the businesses named most often, whether the website is cited, and website readiness. We work to improve and measure AI visibility; we do not promise or guarantee rankings or recommendations. Questions: joshuaofisrael@gmail.com.", 9.5, MUTED);

  var n = doc.getNumberOfPages();
  for (var pg = 1; pg <= n; pg++) {
    doc.setPage(pg); doc.setDrawColor(227, 232, 239); doc.setLineWidth(0.5); doc.line(M, H - 40, W - M, H - 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); color(MUTED);
    text("NamedScan | namedscan.com | Operated by Joshua Israel Ventures LLC", M, H - 26);
    text("Page " + pg + " of " + n, W - M, H - 26, { align: "right" });
  }
  var slug = (r.business.name || "report").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  doc.save("NamedScan_" + slug + "_" + r.date + (r.mode === "sample" ? "_SAMPLE" : "") + ".pdf");
}
