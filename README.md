# NamedScan (working name)

Static marketing site for NamedScan, an AI visibility report product operated by Joshua Israel Ventures LLC.
Hosted free on GitHub Pages from the `main` branch root. No build step.

* `index.html` home (hero, how it works, sample report, pricing and HiRank comparison, hidden results, FAQ, lead form)
* `privacy.html` privacy policy
* `assets/` CSS, JS, favicon
* `data/results.json` controls the Results section. It stays hidden unless `verified` is `true` and `items` holds real, evidenced numbers. Never add example or projected figures.

Lead form: opens a prefilled email to joshuaofisrael@gmail.com. To use Formspree instead, create a free form and set `FORMSPREE_ID` in `assets/site.js`.

Copy rules: no hyphens or dashes in visible copy; never promise or guarantee rankings. HiRank comparison uses only prices published at https://hirank.ai/pricing (checked 30 September 2026); recheck before any update.

Custom domain: none yet. When one is chosen, add a `CNAME` file and update canonical URLs, `robots.txt` and `sitemap.xml`.
