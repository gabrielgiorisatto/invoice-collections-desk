# Invoice Collections Desk

Morning desk for a finance operator: keep the collections queue honest and recover collectible cash. Follow-ups, promises, and **Resolve** are not payment.

## Language

### Money and settlement

**Invoice**:
A customer balance the operator works in this desk — identity, original amount, aging, and linked promise / dispute / contact state.
_Avoid_: Bill, account, AR item

**Remaining**:
The unpaid balance on an **Invoice** after recorded payments (original amount minus sum of payment amounts).
_Avoid_: Outstanding (ambiguous with “at risk”), balance due (UI copy only)

**Settlement**:
How much of the **Invoice** is paid: `open` (**Remaining** equals original), `partial` (**Remaining** between zero and original), or `paid` (**Remaining** is zero).
_Avoid_: Resolved (that is **Resolve**, not cash), collected (implies bank truth)

**Resolve**:
An **ActionKind** that removes an **Invoice** from the active queue **without** counting as cash collected. Requires a **ResolutionReason** and a short note.
_Avoid_: Paid, closed, written off (too narrow), settle

**ResolutionReason**:
Why the operator **Resolve**d without full payment: `dispute_closed`, `credit_issued`, or `other`.
_Avoid_: Close reason, disposition (alone)

### Typed status enums

**PromiseStatus**:
Whether the one dated payment promise exists and whether it still holds: `none`, `active` (due date on or after demo day), or `broken` (due date before demo day and still unpaid). Create, update, or cancel that one promise. Do not stack a second promise on top. Cancelling removes it from the current state; the commitment stays in history.
_Avoid_: Commitment, pledge, “promised” as a free-text label

**DisputeStatus**:
Commercial / quantity dispute state: `none`, `open`, or `resolved`. Create, update, or cancel the one open dispute, including when a promise is broken. A broken promise stays on the invoice. An open dispute is not a cold chase.
_Avoid_: Claim (use **InvoiceAccuracy** for accuracy claims), ticket

**InvoiceAccuracy**:
Whether invoice details are trusted for chase: `ok` (verified) or `unverified_claim` (one open details request). If none is open, flag one. If one is open, confirm it or cancel it — no second flag. Follow-up never sets this.
_Avoid_: Incomplete info, data quality

**OwnerRole**:
Who owns the next action: `operator` (finance operator) or `account_manager` (simulated commercial owner).
_Avoid_: Assignee, owner (alone)

**ActionKind**:
Operator verbs that change invoice state and append history: follow-up (contact note only, always available on an active invoice), flag / confirm / cancel the one details request, create / update / cancel the one promise, record payment, open / update / cancel the one dispute, route to account manager (its own action, not a follow-up), or **Resolve** without payment. Payment and resolve are always available together on an active invoice. Availability is state-gated by `availableActions` (see ADR-0004); paid/resolved invoices have none.
_Avoid_: Event, mutation, update

### Morning focus

**MorningCapacity**:
The fixed count of follow-up slots for one morning session — always **3**.
_Avoid_: Capacity (alone), daily limit

**Next up**:
Operator-facing label for the morning follow-up list (up to **MorningCapacity** invoices). Same selection rules as **Today’s 3**.
_Avoid_: Priority queue (collides with Queue), recommendations, top N

**Today’s 3**:
Domain name for the auto-picked morning set: fill from priority tier **P0** first (fixed P0 order), then backfill from **P1** only when no **P0** candidates remain, capped by **MorningCapacity**. UI shows this as **Next up**.
_Avoid_: Recommendations, AI picks, scoreboard

**Follow-up slot**:
One of the **MorningCapacity** morning slots consumed only by morning follow-up work in **Next up**. Recording **payment received** or **Resolve** does **not** consume a slot.
_Avoid_: Intervention slot (activation workbench term), weekly capacity

### Metric

**Proposed recovery metric**:
`sum(payment amounts recorded)` versus `count(follow-ups logged)` in the session/period. Follow-ups alone are not recovery; **Resolve** is not cash.
_Avoid_: Revenue, conversion rate, predicted recovery
