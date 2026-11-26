# Due-date filter presets

Desk queue and KPIs share a **due-date window** relative to fixed `demoDay` (`2026-11-26`). Default preset is **All time**.

| Preset | Invoice included when `dueDate`… |
|--------|-----------------------------------|
| Last day | is in `[demoDay−1, demoDay]` |
| Last 7 days | is in `[demoDay−6, demoDay]` (7 calendar days inclusive) |
| This month | shares `YYYY-MM` with `demoDay` |
| This year | shares `YYYY` with `demoDay` |
| All time | always |

## KPIs (on the filtered set)

- **Open remaining:** sum of Remaining for active-queue invoices that are not in an open dispute.
- **Paid total:** sum of recorded payment amounts (ADR-0003 cash side), not invoice face when Remaining hits zero.
