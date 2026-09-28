# Complete roadbook verification

Checked on 2026-09-28. These checks cover the website's calculations and behavior; they do not verify live road conditions, hotel inventory or surveyed route geometry.

Navigation update: the map is the first tab and the default homepage; the complete roadbook is the second tab. The browser check now opens the map first, verifies tab order, and explicitly opens the roadbook before table, print and offline checks. Syntax, data, browser, strict audit and design lint checks were rerun successfully for this change (the same five design lint warnings remain).

## Automated checks

| Command | Result |
|---|---|
| `node --check dist/app.js` | Passed JavaScript syntax validation. |
| `node verify.mjs` | Passed 14 verification groups, including all 128 route/optional-loop combinations, connected routes, splits, waits, dates and budget calculations. |
| `node qa-roadbook.mjs` | Passed twice after the final layout fixes. Browser checks and accessibility details are below. |
| `npx -y -p @google/design.md designmd lint DESIGN.md` | Passed with zero errors. Five orphan-token warnings remain because the document does not repeat every CSS consumer inside its component frontmatter; the direct runtime mapping is documented in DESIGN.md. |
| `python <premium-skill>/scripts/audit_project.py . --mode strict --output qa-output/premium-audit-raw.json` | Passed with zero findings, warnings or unresolved ownership. |

`<premium-skill>` denotes the locally installed frontend-design-premium skill directory. The public [premium-audit.json](premium-audit.json) preserves the audit findings and summary; only its machine-specific project root is normalized to `.`. Raw browser outputs and the raw audit are local ignored artifacts.

## Browser coverage

The repository-owned `qa-roadbook.mjs` exercises the static site with Playwright and axe. It supports optional `ROADBOOK_QA_MODULES`, `CHROME_PATH` and `ROADBOOK_URL` environment settings for portable dependency, browser and server locations.

- The default complete roadbook shows all 147 itinerary days. Splitting a day and adding a rest produces 149 rows; switching that modified plan to the inland bypass produces 140. Dates, lodging estimates and downstream changes remain synchronized.
- Stage/search filters update the shared map and table controls, survive URL reload, recover from no results and restore focus when cleared. Keyboard use and a 390px mobile viewport were checked.
- The CSV contains the entire active plan while the table is filtered, including morning/afternoon, lodging and condition text.
- Table-to-map detail navigation and sibling budget, alternatives and preparation screens were exercised. The table owns horizontal scrolling without overflowing the page body.
- Print media and actual PDF generation were exercised. Independent PyMuPDF text extraction confirmed every day label from 1 through 147, the first date `2026-10-01`, the final date `2027-02-24`, and the Dongxing destination across 37 A4 landscape pages. Rendered first and last pages were visually inspected; the last page contains days 145–147 and the full totals/notes. The print table removes its screen scroll-frame clipping.
- Map-tile failure leaves the complete roadbook usable. No JavaScript errors or axe accessibility violations were observed in the exercised states.

Static searches of the changed application files found no native `alert`/`confirm`/`prompt` calls or non-semantic inline click targets. The table, detail and CSV share the existing state engine and presentation helpers. No live-data claim is added.
