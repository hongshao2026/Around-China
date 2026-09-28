# 沿边慢行 interaction contract

Source of business requirements: the user brief is for one driver, a four-wheel-drive vehicle, October departure, more than 90 days if needed, and accepted detours. The complete daily roadbook is the primary overview. Fuel powertrain is unspecified; the cost model defaults to an explicitly editable petrol assumption and also supports electricity. Visual identity and token ownership live in [DESIGN.md](DESIGN.md).

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | `app.js` shared `selectDay` | UX-CONTRACT.md | Single current day via overview button, ledger, map or previous/next; no bulk selection | Browser checks of table-to-map selection and restoration |
| Select/Listbox | Native selects in `index.html` and `app.js` | UX-CONTRACT.md | OS-owned popup, Chinese labels | Keyboard and selection browser checks |
| Date | Native date input in `index.html` | UX-CONTRACT.md | Date-only ISO value; OS-owned popup | Browser date change and `verify.mjs` |
| Form | `app.js` budget-form change handler | UX-CONTRACT.md | Labelled bounded numerical fields; no remote submission | Invalid-value and recalculation browser checks |
| Scrollbar | `styles.css` global baseline | DESIGN.md | Table and map panel geometry only | Desktop/mobile overflow and computed-style checks |
| Toast | `app.js` shared `announce` | UX-CONTRACT.md | One polite live region; durable inline critical notes | Browser feedback checks |
| Plan changes | `engine.js` `buildPlan` | User brief / UX-CONTRACT.md | Connected block replacement; declared midpoint split; rests at actual destination | `verify.mjs` route variants |
| Day presentation | `app.js` `daySchedule`, `stayArea`, `lodgingRange` and `dayNotes` | UX-CONTRACT.md | Table, detail and CSV reuse the same morning/afternoon, lodging area and estimate; table and CSV use complete condition notes | Cross-view and export checks |
| Filters | Shared stage/query state and matching in `app.js` | UX-CONTRACT.md | Map ledger and complete roadbook remain synchronized; URL stores committed scope | Filter, clear, IME and URL browser checks |

## Navigation and dataset scope

Navigation order is complete roadbook (`roadbook`, default), map and day detail (`route`), budget (`budget`), alternatives (`alternatives`), and preparation (`prepare`). Valid existing hash links retain their destination. Each view has a localized page title and visible active navigation state. Opening a day from the table uses the same selection action as the map and ledger, then reveals its map/detail view. Returning to the table preserves selected day and committed filters.

The roadbook renders every current matching day in one semantic, seven-column table without pagination: day/date; route and road; kilometres and pure driving hours; morning/afternoon; sights; lodging area and nightly estimate; conditions and available actions. Important text wraps in full. Selection controls use buttons rather than clickable table rows. Keyboard users can operate controls and the scroll frame.

The map ledger uses explicit **12-item pages**. Stage and committed local search filters are shared between the ledger and the roadbook, reset or clamp ledger paging, and are reflected in the URL. Both views show their filtered/total day counts. Clearing search is immediate and returns focus to its input. Chinese IME composition is not committed until composition ends. Zero results offer a clear-filter recovery action without changing the route itself. Filtering does not change the itinerary, totals or budget.

## Active plan and daily presentation

Every view and export consumes the same `buildPlan` result. Actual sequential day numbers and dates come from the active plan, not from source IDs. Date-only arithmetic must remain correct across month, year and leap-day boundaries. Budget and alternatives use this same plan. Changed departure, added rest, declared splits, optional loops and route replacement recalculate subsequent dates and all relevant totals.

Morning/afternoon is a suggested allocation of driving and rest time, not a verified intermediate navigation route. The existing mid-point text describes a direction or suitable stop area and must not be promoted into a precise half-way town. Driving hours exclude meals, sightseeing, stops and checks. Original rest days may include short local driving; added wait days have zero planned kilometres and driving time. Never zero all rest-day values solely because the day is labelled rest.

Lodging is a suggested area, not confirmed hotel inventory. Table, detail and export reuse the same area helper, `hotelFactor` and current hotel-price assumption. The nightly range is an accommodation estimate, not total daily spending. Remote overnight stops preserve their need for prior confirmation. Conditions, original day notes, long unsplittable segments and split-day status remain available in full. Only declared credible split points support splitting.

Unallocated reserve days belong in the summary and budget. They are not fabricated dated itinerary rows. Existing waits attached to a split day remain at the correct actual destination. Local preferences are versioned, validated and device-local; there are no irreversible operations. Map zoom is transient.

## Scroll, print and CSV

The table alone owns its bounded scrolling region and sticky header/day column. Narrow screens may horizontally scroll the table, but the page body remains within the viewport. Table sizing must not clip the budget or alternatives screens, which keep natural document scrolling. Full cell values and actions stay available at narrow widths and by keyboard.

The print action prints the **current visible filtered table** in landscape, including every matching row. The print heading identifies the scope and separates unallocated reserves. Remove bounded heights, sticky positioning and clipped overflow during printing; table headers repeat and long text wraps across pages. Interactive controls are screen-only. Printing is not a screenshot of only the on-screen rows.

CSV exports the **entire active plan**, even while a table or ledger filter is active. Labels explain this complete-plan scope. Include day/date, stage/road, origin/destination, estimated kilometres/hours, full morning and afternoon arrangements, sights, lodging area and lodging estimate, and conditions. CSV fields are correctly escaped and use a UTF-8 BOM for spreadsheet compatibility. Do not manufacture rows for unallocated reserves. The export must reflect current routes, splits, added waits, dates and hotel assumptions.

## Budget and failure behavior

Budget covers one traveller using their own vehicle; it excludes rental, depreciation and travel from or back to home. Day 1 starts at Dandong. Lodging counts every listed night, including arrival in Dongxing. Local sightseeing distance is already included in applicable daily estimates; an adjustable mileage allowance covers additional access and parking travel. Fixed tickets, tolls, equipment and contingency amounts remain whole-trip assumptions rather than invented daily charges. Unallocated waiting reserve increases time and recurring costs without adding imaginary driving distance.

External map tiles may fail; route markers, the complete table and daily text remain available. Tile failures offer retry without blocking the rest of the plan. Local-storage failure leaves the current page usable and visibly explains that persistence is unavailable. Invalid budget or date inputs display field-linked errors and preserve the last valid calculations. No live routing or current hotel-availability claims are made. External destination searches are not verified navigation itineraries.

## Reconciled inherited documentation

The source design context predates the complete overview. This revision intentionally makes the table the default while retaining the established map workflow and visual tokens. The copied ledger contract said 16 rows; the existing implementation uses 12, so the contract now records 12. Map dimensions and breakpoints are documented from the existing responsive CSS rather than the earlier approximate prose. No new theme or global palette change is introduced.
