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
Whether a dated payment promise exists and whether it still holds: `none`, `active` (due date on or after demo day), or `broken` (due date before demo day and still unpaid).
_Avoid_: Commitment, pledge, “promised” as a free-text label

**DisputeStatus**:
Commercial / quantity dispute state: `none`, `open`, or `resolved`.
_Avoid_: Claim (use **InvoiceAccuracy** for accuracy claims), ticket

**InvoiceAccuracy**:
Whether invoice details are trusted for chase: `ok` or `unverified_claim` (customer says details are wrong; not yet verified).
_Avoid_: Incomplete info, data quality

**OwnerRole**:
Who owns the next action: `operator` (finance operator) or `account_manager` (simulated commercial owner).
_Avoid_: Assignee, owner (alone)

**ActionKind**:
The kind of operator action recorded on an **Invoice**: follow-up, dated promise, dispute update, route to account manager, verify accuracy, payment received (full or partial), or **Resolve**.
_Avoid_: Event, mutation, update

### Morning focus

**MorningCapacity**:
The fixed count of follow-up slots for one morning session — always **3**.
_Avoid_: Capacity (alone), daily limit

**Today’s 3**:
The up-to-three **Invoice**s auto-picked for this morning: fill from priority tier **P0** first (fixed P0 order), then backfill from **P1** only when no **P0** candidates remain, capped by **MorningCapacity**.
_Avoid_: Recommendations, AI picks, scoreboard, top N

**Follow-up slot**:
One of the **MorningCapacity** morning slots consumed only by morning follow-up work in **Today’s 3**. Recording **payment received** or **Resolve** does **not** consume a slot.
_Avoid_: Intervention slot (activation workbench term), weekly capacity

### Metric

**Proposed recovery metric**:
`sum(payment amounts recorded)` versus `count(follow-ups logged)` in the session/period. Follow-ups alone are not recovery; **Resolve** is not cash.
_Avoid_: Revenue, conversion rate, predicted recovery
