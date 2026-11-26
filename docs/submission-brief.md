# Invoice Collections Desk — submission brief

**Repo:** https://github.com/gabrielgiorisatto/invoice-collections-desk

A finance operator has half an hour and a spreadsheet sorted by age. Age mixes a broken promise, a promise that is not due, a quantity dispute, an invoice nobody has called, and a customer who says the bill is wrong. This desk replaces that pile with three morning follow-ups, a queue, and actions that mean different things.

No hosted URL is included. Render steps are in the README. The service has not been created.

## Who it is for

The buyer is a finance manager who wants collectible cash without damaging accounts that are stuck for a commercial reason. The person at the screen is the finance operator. The account manager exists only as a labeled simulation when a dispute is handed off.

## What the reviewer should see in a few minutes

Open the desk on demo day 2026-11-26.

Next up is **Dune**, **Brook**, and **Grove**. Not Aster, even though Aster is $12,000 and 45 days overdue. Aster is an open quantity dispute, so it stays in the queue as Med. Crest promised to pay in two days, so it is Low and it waits. Dune promised five days ago and did not pay, so it is first.

Open Aster and Brook side by side. Aster’s chase actions are off and say why. Brook’s primary action is a first follow-up. That is the product: different situations, different next click.

Record a full payment on Brook. Brook leaves the queue and Paid total moves. Record a follow-up somewhere else. Paid total does not move. Resolve Crest. Crest leaves the queue and Paid total still does not move. Refresh. The session is still there.

The in-app Guide says the same thing in operating language: each dashboard field, what Next up is and when it changes, each status and column, and what each drawer action does and when it is available.

## The judgment, in one pass

Ranking is four tiers from enums, not a score. P0 fills the three slots in a fixed order (broken promise, never contacted, unverified details). P1 backfills only when a P0 is gone. We refused a point model because it looks like a prediction and cannot be checked against a rule.

Grove is a task. The operator confirms the details or opens a dispute. A follow-up cannot clear the flag.

Cash is the sum of recorded payments, including partials. Remaining is face amount minus those payments. Follow-ups, promises, and resolve are not cash. The metric “cash collected vs follow-ups completed” is a proposal for how a buyer would read the desk. It is not a measured recovery rate. Nothing here is a bank feed.

The queue is for scanning (soft row tint, short tags, external filters, column sort). The drawer is for the decision (paid and due, state chips, the full action list with reasons, activity). Disabled actions stay visible.

## What we left out

No bank, no payment processing, no reminders, no ledger, no legal workflow, no full dispute or account-manager product, no login. Partial payments are in, on purpose.

## How it is built

Node 22, React, Ant Design, a pure `domain/` with Vitest, and an Express API. One HTTP-only cookie, one SQLite row per browser. `npm test` is 62 tests on rules, lifecycle, filters, and the API. `npm start` listens on `PORT` and serves `/`. `render.yaml` builds with dev dependencies available, starts that server, and mounts a 1 GB disk at `/var/data` on a Starter instance so the file survives a deploy. Free Render has no disk; the README says what you lose.

Longer reasoning is in `docs/decisions.md`. Setup, the metric, the manual checklist, and the walkthrough in full are in the README.

## Ownership

Cursor agents drafted the code, the tests, and these notes. The product decisions are the author’s: tiers instead of scores, partial payments, resolve distinct from paid, Grove as an operator action, and a morning queue rather than a generic invoice admin. Edit that sentence to match how you want it told.
