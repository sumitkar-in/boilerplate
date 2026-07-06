---
name: page-view-dashboard
description: Use when designing analytics, overview, home, KPI, reporting, admin summary, or executive dashboard pages. Provides restrained dashboard patterns for metrics, trends, alerts, and drilldowns.
---

# Page View: Dashboard

Use this for summary pages that help users decide where to act next.

## Layout

- Header: page title, date/range selector, optional tenant/project context.
- Top row: 3-5 KPI tiles with value, delta, and plain-language label.
- Main area: one primary chart/table and 2-3 supporting panels.
- Alerts/tasks: show only actionable exceptions.
- Drilldowns: link cards and chart points to the underlying table/list module.

## Rules

- Do not fill dashboards with decorative cards. Every panel needs a decision purpose.
- Prefer comparison, trend, and exception over raw totals.
- Keep empty metrics explicit: `0`, `No data yet`, or `Not configured`.
- Avoid oversized hero sections in operational dashboards.
- Keep charts legible before decorative; show axis labels and useful tooltips.

## Implementation

- Put metric definitions in typed config objects.
- Keep data formatting helpers shared: currency, percent, dates, counts.
- Use skeletons for metrics and charts; avoid layout shifts.
- Add source labels or timestamps when data freshness matters.
