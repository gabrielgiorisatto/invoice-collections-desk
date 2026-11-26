# Decisions

These are the calls that shape the desk. The ADRs under `docs/adr/` are the short records. This note is the reasoning a reviewer can read once.

## Priority tiers, not a score

The morning question is “which three invoices should a person touch,” not “who is 87 likely to pay.” A point model (age × amount × days since contact) looks precise and hides the judgment. It also reads as a prediction. We rejected it.

Tiers come from enums the operator can see: promise none / active / broken, dispute none / open / resolved, invoice details ok / unverified, and whether anyone has been contacted. First matching rule wins.

P0 is the work that belongs in the three slots, in a fixed order: broken promise (Dune), then never contacted and not in dispute (Brook), then details the customer challenged and we have not checked (Grove). P1 is real but secondary: an open dispute (Aster), or two unanswered follow-ups with an account manager named (East). P1 fills a slot only when a P0 is gone. P2 is an active promise (Crest). P3 is nothing left to chase. Inside a tier, a larger remaining balance wins, then more days overdue.

The consequence is visible on the seed. Aster is $12,000 and 45 days late, and it is not in Next up. Brook is $1,800 and is. Age-sorted collections would have done the opposite. We would rather the operator call the untouched invoice than lean on a disputed one.

## Grove is something the operator does

“Details might be wrong” was easy to leave as a badge. That makes Grove a label instead of a task. The operator has to either confirm the invoice or turn the claim into a dispute.

Two actions own that flag: **Flag details for review** and **Confirm details verified**. A follow-up is only a contact note. It must not clear Grove, and it must not set the flag either. Otherwise “I sent an email” and “I checked the remittance” become the same click. Confirm requires a note, so an empty save cannot wipe the flag. After a real confirm, Grove is no longer P0.

## Cash is not activity

The buyer’s number has to separate money from motion. The proposed metric is the sum of payments the operator recorded, next to the count of follow-ups. It is proposed. The sample invoices are fiction, and nothing here is reconciled to a bank.

That rule is why several actions are deliberately powerless over Paid total:

- A follow-up adds activity only.
- A promise stores a date. Future dates wait. Past unpaid dates become broken. Neither is cash.
- Resolve takes the invoice out of the queue with a reason (`dispute_closed`, `credit_issued`, `other`) and a note. It is how commercial cleanup leaves the morning list without pretending the money arrived.
- Partial payments are in. Remaining is the face amount minus the payments on file. Recording $500 against Dune’s $3,500 raises Paid total by $500 and leaves Dune in the queue. Only a zero remaining, or a resolve, drops it.

Open remaining on the desk also skips open disputes. Aster’s balance is still in the table. It is not added to the “cash we could chase this morning” figure. That is a display decision, not a write-off.

## The lifecycle is a gate, not a hint

Every button is always on the drawer, in one order, so the operator learns the set. The blue one is the preferred legal action for that state. The others are disabled with a sentence, not hidden.

The same matrix runs in `applyChange` on the server. A disabled button is not the control. Broken-promise invoices can take a follow-up, a new promise, or a payment. An active promise can take a payment or a resolve, not another chase. An open dispute can be updated, routed to the account manager, or resolved. Paid and resolved invoices have no actions.

Route to AM is allowed for an open dispute and is labeled a simulation. East’s “AM available” line is why East is P1. It does not unlock Route to AM. East is still a follow-up until someone opens a dispute.

## Table for the scan, drawer for the decision

The queue is a glance: customer over invoice code, remaining, due date with the overdue count, and short tags. Row color is the tier (soft red, amber, blue, green) so High work is visible without reading every tag. Tags are solid and muted, not a second rainbow. A dash means “none,” not a gray pill that looks like a status.

The drawer is where the amounts and the state are structured: paid of face amount, due date and overdue days, then promise / dispute / details as chips, then the action list and the activity timeline. The timeline stays because a follow-up that is not cash still has to be visible after refresh. Sorting and the Status / Promise / Priority filters live on the table, outside the cells, so filtering is not an Excel-style per-column widget and does not fight the row tint.

## One cookie, one file

There is no account system. The browser holds an HTTP-only cookie. SQLite holds the invoice JSON for that id. Refresh is a read of the same row. Two tabs compare a revision and the loser gets a conflict instead of a silent overwrite.

On Render, that file is worth keeping only if it sits on a disk. Free instances have no disk, so the file dies with the container and the next request for that cookie reseeds. The blueprint therefore uses a Starter instance and mounts `/var/data`. That is a deploy choice, not a claim that a hosted URL already exists.
