# Invoice Collections Desk — submission brief

**Repo:** https://github.com/gabrielgiorisatto/invoice-collections-desk

A finance operator has half an hour and a spreadsheet sorted by age. Age mixes a broken promise, a promise that is not due, a quantity dispute, an invoice nobody has called, and a customer who says the bill is wrong. This desk replaces that pile with three morning follow-ups, a queue, and actions that mean different things.

Live: https://invoice-collections-desk.onrender.com/. Local setup and the demo login (`operator` / `demo`) are in the README. Logout clears the session. `render.yaml` is the host blueprint.

## Who it is for

The buyer is a finance manager who wants collectible cash without damaging accounts that are stuck for a commercial reason. The person at the screen is the finance operator. Route to the account manager is a labeled simulation on any active invoice, not a second product.

## What the reviewer should see in a few minutes

Open the desk on demo day 2026-11-26.

Next up is **Dune**, **Brook**, and **Grove**. Not Aster, even though Aster is $12,000 and 45 days overdue. Aster is an open quantity dispute, so it stays in the queue as Med. Crest promised to pay in two days, so it is Low and it waits. Dune promised five days ago and did not pay, so it is first.

Open Aster and Brook side by side. Aster’s suggested action is Route to AM. Brook’s is a first follow-up. Follow-up stays available on Aster and does not clear the dispute. That is the product: different situations, different next click.

Record a full payment on Brook. Brook leaves the queue and Paid total moves. Record a follow-up somewhere else. Paid total does not move. Resolve Crest. Crest leaves the queue and Paid total still does not move. Refresh. The session is still there.

The in-app Guide says the same thing in operating language: each dashboard field, what Next up is and when it changes, each status and column, and what each drawer action does and when it is available.

## The judgment, in one pass

Ranking is four tiers from enums, not a score. P0 fills the three slots in a fixed order (broken promise with no open dispute, never contacted, unverified details). A broken promise with an open dispute is P1. P1 backfills only when a P0 is gone. We refused a point model because it looks like a prediction and cannot be checked against a rule.

Grove is a task. The operator confirms the details or opens a dispute. A follow-up cannot clear the flag.

Cash is the sum of recorded payments, including partials. The invoice shows Paid of its total. Follow-ups, promises, and resolve are not cash. The metric “cash collected vs follow-ups completed” is a proposal for how a buyer would read the desk. It is not a measured recovery rate. Nothing here is a bank feed.

The queue is for scanning (short tags, external filters, column sort). The drawer is for the decision (Paid of the total, due, state chips, the full action list with reasons, activity marked Answered or Unanswered). Disabled actions stay visible.

## What we left out

No bank, no payment processing, no reminders, no ledger, no legal workflow, no full dispute or account-manager product, no real accounts. Partial payments are in, on purpose. The sign-in screen is the demo account in the README.

## How it is built

Node 22, React, Ant Design, a pure `domain/` with Vitest, and an Express API. One HTTP-only cookie, one SQLite row per browser. `npm start` listens on `PORT` and serves `/`. `render.yaml` is the host blueprint.

The reviewer read is the README. The same calls, shorter, are in `docs/decisions.md`.

## Ownership

Cursor agents drafted the code, the tests, and these notes. The product decisions are the author’s: tiers instead of scores, partial payments, resolve distinct from paid, Grove as an operator action, and a morning queue rather than a generic invoice admin. Edit that sentence to match how you want it told.
