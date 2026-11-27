# Decisions

The README is the reviewer read. This note is the same calls, shorter. The ADRs under `docs/adr/` are the records.

## Next up

Three slots. P0 first, in order: broken promise with no open dispute, never contacted with no open dispute, unverified details. Then P1. P2 and P3 never fill a slot. A broken promise with an open dispute is P1. It is not a cold chase.

A follow-up does not remove an invoice. Priority does, and only from Next up. Brook’s first contact drops “never contacted,” so Brook leaves P0 and becomes P1. On the seed, Aster takes the open slot. Brook stays in the queue until it is paid or resolved. A follow-up on Dune leaves the broken promise in place, so Dune stays first.

Inside P0 the fixed order above wins. After that, a larger remaining balance wins, then more days overdue. The queue uses that same order.

## Tiers, not a score

P0–P3 come from the enums on the invoice. The first matching rule wins. There is no point total and no pay-likelihood score. The desk labels them High, Med, Low, and Clear. See [ADR-0001](adr/0001-priority-tiers-not-points.md).

## Status and legal actions

Status is a label, separate from the tier. First match: Paid, Resolved, Disputed, Broken, Promised, Partial, Needs check, Open. A partial does not, by itself, change the tier.

On an active invoice the drawer always allows follow-up, one promise, one dispute, record payment, and resolve without payment. The others stay on screen, disabled, with the reason. The server enforces the same list.

| Invoice | Also legal |
| --- | --- |
| Brook, open | Flag details |
| Dune, broken promise | Cancel the promise |
| Crest, promise still ahead | Cancel the promise |
| Grove, details unverified | Confirm or cancel the details request |
| Aster, open dispute | Cancel the dispute, route to account manager |
| Paid or resolved | None |

A follow-up is a contact note. It does not set or clear the details flag. One details request, one promise, and one dispute: flag or create when none is open, then update or cancel. A dispute can be opened on a broken promise; the promise stays. See [ADR-0004](adr/0004-action-lifecycle.md).

## Cash versus follow-ups

Cash collected is the sum of recorded payments, shown as Paid total. Follow-ups completed is the count of follow-up notes, including the seed. That pair is proposed. It is not measured recovery, and it is not a bank or ledger figure.

A partial payment counts for the amount entered and leaves the invoice in the queue. Resolve leaves the queue with a reason and a note. Resolve is not paid. See [ADR-0002](adr/0002-resolve-is-not-paid.md) and [ADR-0003](adr/0003-proposed-recovery-metric.md).
