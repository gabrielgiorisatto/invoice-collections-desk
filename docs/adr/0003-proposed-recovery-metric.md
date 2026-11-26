# Proposed recovery metric

Success is framed as **cash attested vs activity**, not activity alone:

- **Cash side:** `sum(payment amounts recorded)` in the session/period
- **Activity side:** `count(follow-ups logged)`

Follow-ups, promises, AM routing, and **Resolve** are not cash. Partial payments count only for the amount recorded. This is a **proposed** demo metric, not measured revenue or bank truth.

**Follow-up slots:** only morning follow-up work consumes **MorningCapacity**. Payments and **Resolve** do not.
