# NamedScan (working name)

Static marketing site for NamedScan, an AI visibility report product operated by Joshua Israel Ventures LLC.
Hosted free on GitHub Pages from the `main` branch root at https://namedscan.com (CNAME file). No build step.

Backend: Cloudflare Worker `namedscan-api` (source in the private workspace, not in this repo). The site only calls https://namedscan-api.joshofisrael.workers.dev; no API keys live in this repo.

* `index.html` home (hero, how it works, sample report, pricing and HiRank comparison, hidden results, FAQ, lead form)
* `privacy.html` privacy policy
* `assets/` CSS, JS, favicon
* `data/results.json` controls the Results section. It stays hidden unless `verified` is `true` and `items` holds real, evidenced numbers. Never add example or projected figures.

Scan form: `assets/scanform.js` posts to the API; `assets/report.js` renders the report and builds the PDF in the browser (jsPDF, MIT, vendored in `assets/vendor`). `thanks.html` is the Stripe success page (access key + first report), `report.html` opens private report links.

Copy rules: no hyphens or dashes in visible copy; never promise or guarantee rankings. HiRank comparison uses only prices published at https://hirank.ai/pricing (checked 30 September 2026); recheck before any update.

Custom domain: namedscan.com (Namecheap DNS: A records to GitHub Pages, www CNAME to joshuaofisrael.github.io).
