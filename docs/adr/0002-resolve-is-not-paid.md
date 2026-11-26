# Resolve ≠ paid

Leaving the active queue and collecting cash are different outcomes. **Payment received** (full or partial) updates **Remaining** / **Settlement** and may count toward the **Proposed recovery metric**. **Resolve** removes an **Invoice** from the active queue **without** counting as cash.

## Resolve action

- **ActionKind**: Resolve
- Requires **ResolutionReason**: `dispute_closed` | `credit_issued` | `other`
- Requires a short note
- Leaves the active queue; does **not** set **Settlement** to `paid` unless payments already brought **Remaining** to zero
- Does **not** increment cash collected
- Does **not** consume a **Follow-up slot** (same as payments)

## Why

Operators close work for commercial reasons that are not bank receipts. Collapsing resolve into “paid” would fake recovery and break the metric (sum of payments vs follow-up count).
