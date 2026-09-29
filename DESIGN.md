---
version: alpha
name: 沿边慢行
description: A Chinese road atlas with two directional winter itineraries for one driver.
colors:
  primary: "#224e76"
  ink: "#182b3c"
  accent: "#b44b24"
  background: "#f1f5f8"
  surface: "#ffffff"
  muted: "#526779"
  border: "#d6e0e8"
  warning: "#8f4519"
typography:
  sans:
    fontFamily: '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif'
  display:
    fontFamily: '"STSong", "SimSun", serif'
  mono:
    fontFamily: '"Consolas", monospace'
rounded:
  DEFAULT: "0.75rem"
  sm: "0.375rem"
spacing:
  section-gap: "2rem"
  page-max: "100rem"
components:
  button:
    height: "2.5rem"
  panel:
    rounded: "0.75rem"
---

## Overview

Product register. A personal Chinese-language roadbook for one four-wheel-drive traveller leaving in October. It contains two explicit plans: Dandong to Dongxing, and Fangchenggang to Dandong. The map workspace is the first tab and default screen. The complete daily overview is the second tab: compare the whole journey, then open a day on the map to inspect or adjust it. The signature remains an atlas-like blue northern route and burnt-orange western route, paired with numbered days. Avoid a marketing hero, travel-agency sales copy, or a false turn-by-turn map.

The overview extends the existing map, budget, alternatives and preparation screens without changing their visual identity. Runtime ownership is Model B: `dist/styles.css` remains canonical; this document mirrors accepted shared values and explains their use. There is no theme adapter, generated token layer or remote font dependency.

## Colors

Blue denotes G331, orange G219, muted purple an actual detour. Selected days use a pale blue surface plus a visible border or selection indicator and semantic current state. Warnings use text and a label, never color alone. White panels on a cool slate background keep the long table, maps and controls legible. Preserve the same semantic palette in every view.

## Typography

Chinese sans body at 16px with comfortable line height. Recurring table content should remain readable rather than being shrunk to force all columns onto a phone. Serif is reserved for compact display titles; monospace and tabular figures distinguish day numbers, dates, mileage and prices. Full sights, lodging and condition text wraps in cells; no ellipsis or line clamp may conceal route instructions.

## Layout

The direction selector sits above the shared summary. It uses two full-width route strips rather than a generic dropdown so the origin, destination and winter consequence stay visible. The active plan is identified by checked state, border, inset route line and text; color is not the only cue. On phones the strips stack without hiding either plan.

The second-tab roadbook has seven columns: day/date, route, distance/driving time, morning/afternoon, sights, lodging/budget, and conditions/actions. All current matching days are rendered without pagination. The table owns a bounded scroll frame with a sticky header and sticky day column. The rest of the document scrolls naturally; table geometry must not constrain sibling forms or the shared page shell. The row count and an explanation of the current scope stay visible above the frame.

On narrow screens the table may scroll horizontally inside its frame. The body must not overflow horizontally. Keep touch and keyboard access to the complete text and controls, and make horizontal scrolling discoverable. Do not replace the table with a lossy summary of each day.

The map workspace retains a day ledger, fluid geographic map and persistent detail panel. At the standard desktop breakpoint its columns are 265px, fluid, and 345px; below 1050px the detail moves under the map, and below 720px the panels stack. Larger and intermediate viewports use the existing responsive variants. Budget and route alternatives retain natural document scrolling. No body overflow lock.

Printing is a separate complete-roadbook presentation: landscape pages, repeated table headings, full visible filtered rows and wrapped text. Remove screen-only height, sticky positioning and overflow clipping from the print table. Navigation, filters and interactive actions do not consume print space. A printed subset must state its active scope; CSV always exports the entire active plan.

## Elevation & Depth

Borders define panels and table cells. A restrained shadow is reserved for map controls. Sticky table cells use opaque semantic surfaces so scrolled text cannot show through. Do not add floating decorative cards or a second visual hierarchy for the new screen.

## Shapes

12px outer panels and 6px controls, compact highway shields and circular map stops. Table rows stay rectangular inside the existing panel geometry.

## Components

Native buttons and links own actions and navigation. The plan direction uses native radio inputs with authored visible labels. Native select/date popups are intentionally OS-owned. Every field has an explicit label and inline error. Direction changes, route changes, day splitting and added rest days use the same state engine, recalculate totals and show a live status. The northbound plan defaults to the inland bypass and town-based winter alternatives. Preferences are saved locally with a visible storage-failure fallback. No account or payment flow.

Global scrollbars use the existing shared thumb, track and hover tokens, with forced-colors overrides. New scroll frames inherit that baseline; only geometry such as stable gutters is table-specific. Keyboard focus is blue 3px. Disabled actions have text explanations. Reduced-motion disables transitions and map animation.

Map markers have accessible controls and equivalent day-list/table controls. Geographic lines connect approximate towns, not road geometry; a permanent visible caption states this. Offline tiles leave route geometry and text accessible. The local photograph is used only in the preparation panel and credited as illustrative Xinjiang scenery, not a particular day or current season.

Token mapping is direct, with no copied theme layer:

| Document token | Canonical runtime target | Shared consumers |
|---|---|---|
| `colors.primary`, `colors.ink`, `colors.accent` | `--primary`, `--ink`, `--accent` | Text, links, focus, route labels and selection |
| `colors.background`, `colors.surface`, `colors.muted` | `--background`, `--surface`, `--muted` | Page, panels, table cells and secondary copy |
| `colors.border`, `colors.warning` | `--border`, `--warning` | Controls, table borders and conditions |
| `typography.sans`, `typography.display`, `typography.mono` | `--font-body`, `--font-display`, `--font-data` | Body, titles and route figures |
| `rounded.DEFAULT`, `rounded.sm` | `--radius`, `--radius-sm` | Panels and controls |
| `spacing.section-gap`, `spacing.page-max` | `--section-gap`, `--page-max` | Shared layout |
| `components.button.height`, `components.panel.rounded` | Global button minimum height, `.panel` radius | Shared buttons and panels |

## Do's and Don'ts

- Do expose conditional winter segments and unverified lodging at the point of decision.
- Do state which direction is active and where that direction reaches winter first.
- Do recompute dates, kilometre estimates, lodging estimates and budget from the same active plan.
- Do preserve the full roadbook in the table, printed view and complete-plan CSV.
- Do distinguish actual itinerary days from unallocated contingency days.
- Don't imply road estimates are live navigation, hotels are booked, or historical bulletins describe current road status.
- Don't split a remote high-altitude day at a location with no credible overnight plan.
- Don't hide route instructions to make the table fit, or apply the table's scroll constraints to the budget form.
