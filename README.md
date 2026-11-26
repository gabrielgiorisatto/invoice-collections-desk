# Invoice Collections Desk

Morning desk for a finance operator who has about half an hour and three follow-ups worth doing. Public repo: [gabrielgiorisatto/invoice-collections-desk](https://github.com/gabrielgiorisatto/invoice-collections-desk).

There is no live URL yet. The Render section below is how to create the service. Do not treat a guessed `onrender.com` host as deployed.

## Buyer

Finance manager at a B2B distributor that sells on credit. They want cash collected without burning accounts that are disputed, promised, or simply not checked yet. They also want a number that separates money from activity.

## Primary user

The finance operator, one person, one sitting. They sign in with the demo account, work **Next up**, and record what they did. The sign-in screen is a simulation, not real authentication. The account manager is a labeled simulation, not a second app.

## Business outcome

Collect cash that is actually collectible, and stop spending the morning on invoices that should wait or go to someone else. A follow-up, a promise, and a resolve are work. They are not cash.

## Workflow replaced

The operator used to sort a spreadsheet by age and keep notes somewhere else. Age treats a 60-day dispute, a promise due tomorrow, and a small invoice nobody has called the same way. The desk splits those.

## Trade-off

Morning slots prefer work the operator can act on: a broken promise, a first contact, then an invoice whose details are unverified. A large open dispute (Aster, $12,000) stays visible and is not auto-picked ahead of a smaller first call (Brook, $1,800). Oldest disputed dollars lose to recoverable work. That is intentional.

## Proposed metric

**Cash collected** against **follow-ups completed**.

- Cash: sum of payment amounts the operator recorded (`Paid total` on the desk).
- Activity: count of follow-ups logged.

This is a proposed way to read the demo. It is not measured recovery, not bank truth, and not a claim that the sample customers paid. Promises, follow-ups, routing to an account manager, and resolve-without-payment do not add to cash. A partial payment counts only for the amount entered.

### How you would measure it

On a real book, for a week or a month: sum of payments attested in the desk, divided by follow-ups logged in the same window, with promised-not-due and open-dispute balances reported beside that ratio so they are not hiding inside it. You would reconcile the payment sum to the ledger before calling it recovery. This prototype does not do that reconciliation.

## Deliberate outs

Not in this product:

- No bank connection and no payment processing
- No email, SMS, or other reminders
- No ledger or ERP sync
- No legal collections
- No full dispute desk and no full account-manager screen
- No real accounts, roles, or multi-operator locking. The sign-in screen is one published demo account, labeled as a simulation
- No model that predicts who will pay

Partial payments **are** in scope.

## Assumptions

Invoices are synthetic, in USD, dated from a fixed demo day (`2026-11-26`). Payment received means the operator said cash arrived. Route to AM hands ownership to the named account manager inside this session only. One operator, one cookie.

## Local setup

Node 22 or newer. No secrets.

```sh
npm ci
npm test
npm run dev
```

Open http://localhost:5173. Sign in with the demo account below, or press **Use demo account**.

## Demo sign-in

The desk stays behind a sign-in screen until this login succeeds. It is a simulation, not real authentication. There is one account:

| Username | Password |
| --- | --- |
| `operator` | `demo` |

**Use demo account** fills those fields and signs in. The server then sets the `collections_demo` cookie (HTTP-only, SameSite=Lax). Invoice routes answer 401 until that cookie exists.

Production mode on the same machine:

```sh
npm run build
npm start
```

`npm start` sets `NODE_ENV=production`, listens on `PORT` (default 5173) on `0.0.0.0`, and serves the built client. Health check path is `/`.

The session file is `collections.sqlite` in the working directory unless `SQLITE_PATH` is set.

## Deploy on Render

Create a **new Web Service** from GitHub repo **gabrielgiorisatto/invoice-collections-desk**. The service does not exist yet, so this file does not link a deploy URL.

### Blueprint

1. In the [Render dashboard](https://dashboard.render.com), choose **New → Blueprint**.
2. Connect the GitHub account that can see `gabrielgiorisatto/invoice-collections-desk` and select that repo.
3. Render reads `render.yaml`. Apply it.
4. The blueprint uses instance type **Starter**, because a persistent disk is not available on Free. The disk `collections` mounts at `/var/data` (1 GB). `SQLITE_PATH` is `/var/data/collections.sqlite`.
5. Build command: `npm ci --include=dev && npm run build`. Start command: `npm start`. Health check path: `/`.
6. After the first successful deploy, the service page shows the public URL. Paste that URL here. Until then, there is nothing to open.

`--include=dev` is required so TypeScript and Vite are present at build time. `npm start` runs the server with `tsx` (a runtime dependency) and `NODE_ENV=production`.

### Manual Web Service

If you do not use the blueprint:

1. **New → Web Service**. Connect **gabrielgiorisatto/invoice-collections-desk**. Branch `main`.
2. Runtime **Node**. **NODE_VERSION** = `22`.
3. Build command: `npm ci --include=dev && npm run build`
4. Start command: `npm start`
5. Health check path: `/`
6. Instance type **Starter**. Add a disk named `collections`, mount path `/var/data`, size 1 GB.
7. Environment variable `SQLITE_PATH` = `/var/data/collections.sqlite`
8. Create the service. The URL appears on the service page after deploy. Do not invent one.

### If you stay on Free

Remove the disk and do not set `SQLITE_PATH`. SQLite then sits on the instance filesystem (`collections.sqlite`). That file is ephemeral: a new deploy or a spin-down drops it. The browser cookie (`collections_demo`, HTTP-only, SameSite=Lax) still identifies the session, but with the file gone the server writes a fresh seed for that cookie. Paid Starter plus the disk is what makes refresh-after-deploy keep the same payments and notes.

`PORT` comes from the environment. Render sets it. The app does not hard-code a public port.

## Engineering choices

- **Priority is P0–P3**, from typed enums, not points and not a pay-likelihood score. Today’s three are filled from P0 in a fixed order (broken promise, then never contacted, then unverified details), then P1 only if a P0 slot is empty. Crest (active promise) is P2 and is not auto-picked. See `docs/adr/0001-priority-tiers-not-points.md`.
- **Resolve is not paid.** It leaves the queue with a reason and a note. It does not add cash. See `docs/adr/0002-resolve-is-not-paid.md`.
- **Partial payments are in scope.** Remaining is invoice amount minus recorded payments. A partial stays in the queue.
- **Session** is a SQLite row keyed by an HTTP-only cookie. The cookie is set only after the demo sign-in, and signing out clears it. The row stores the invoice list. Refresh reads it back. Writes use a revision check so two tabs cannot silently overwrite each other.
- **Grove** is operator-actionable. One details request: flag it, then confirm or cancel it. A follow-up never sets or clears that flag.
- **Actions are gated** by state on the server, not only in the button. Disabled actions stay on screen with the reason.
- Narrative of these calls: `docs/decisions.md`. Short sendable summary: `docs/submission-brief.md`.

## What a reviewer can trust

The domain tests are the rules: which invoice is next, what leaves the queue, and what counts as cash. The HTTP tests sign in, then read and write the SQLite session for every route the server exposes, including each invoice action and a file that is closed and opened again. Lint checks the TypeScript. GitHub Actions runs those three — `test`, `lint`, and `build` — on pull requests and on pushes to `main`.

That workflow does not block a merge by itself. In the GitHub settings for this repo, branch protection on `main` has to require the `test`, `lint`, and `build` checks. Until that is turned on, a red pull request can still be merged.

## What was tested

`npm test` runs 76 Vitest tests in `domain/` and `server/`:

- Seed tiers and Today’s 3 order (Dune, Brook, Grove); P1 backfill only after P0 is gone; Crest is not auto-picked
- Due-date windows and the queue empty vs all-cleared distinction
- Status, promise, and priority filters, and column sort
- Lifecycle matrix, disabled reasons, and `applyChange` boundaries (one details request, one promise, dispute on a broken promise, partial and full payment, resolve ≠ paid, Grove confirm-details)
- Demo sign-in (published credentials set the session cookie; a wrong password and an unsigned request do not) and sign-out (the cookie is cleared), HTTP session cookie, reload of the same payload, validation (empty note, bad amount), and the action routes used by the desk

`npm run build` typechecks and builds the client.

## Known limits

- One demo account. The sign-in screen is not real authentication, and there is no audit of who clicked.
- Demo day is fixed. “Last 7 days” is relative to 2026-11-26, not to the wall clock.
- Route to AM changes owner and next action inside the session. Nobody is notified.
- Open remaining excludes open disputes. That is a display choice so Aster’s $12,000 is not treated as chaseable cash. The dispute is still in the queue.
- The disk keeps SQLite across deploys of **one** instance. It does not replicate, and deleting the Render service deletes the disk.
- Free tier, or a disk that was never mounted, loses the file on restart.

## Next steps

- Create the Render service with the steps above and put the real URL in this file.
- If more than one operator shares a book, replace the cookie session with accounts and a real audit actor.
- Reconcile attested payments to a ledger before anyone reports the metric as recovery.
- A real account-manager handoff would be a message with the next action, not a label.

## Seeded reviewer walkthrough

Demo day is 2026-11-26. Start from a fresh session (new browser, or delete `collections.sqlite`). Sign in as `operator` / `demo`, or press **Use demo account**.

1. **Next up** is Dune, Brook, Grove. East and Aster are in the queue as Med. Crest is Low.
2. **Aster vs Brook.** Open Aster. Primary path is the dispute: update it, cancel it, or route to the account manager. Route to AM is its own action, not a follow-up. Follow-up is still there as contact only. Payment and resolve sit together and stay available. Open Brook. Primary path is a first follow-up. Brook has no dispute and no prior contact.
3. **Future promise vs broken.** Crest’s promise is two days out. The card reason says to wait, and Crest is not in Next up. Dune’s promise date is in the past. Dune is first, and the drawer says the promise is broken.
4. **Incomplete follow-up.** Open Grove. The customer claims the details are wrong and that claim is not verified. Confirm the open request or cancel it. A second flag is disabled. A plain follow-up does not clear that flag. After a real confirm or cancel, Grove drops from High.
5. **Paid leaves the queue.** On Brook, record payment for the full remaining amount. Brook leaves the queue and Next up. Paid total rises by $1,800. Open remaining falls by $1,800. A follow-up on another invoice does not move Paid total. Turn on **Show paid** above the queue to see Brook (and any resolved invoices) in the table again. Turn it off to hide them.
6. **Partial.** On Dune, record a payment smaller than $3,500. Dune stays in the queue with a lower remaining. Paid total rises only by the amount entered.
7. **Resolve is not paid.** On Crest, resolve with a reason and a note. Crest leaves the queue. Paid total does not change.
8. **Reload.** Refresh. The same payments, notes, and queue are still there.
9. **Filters.** Set Status to Disputed: Aster remains, the others drop. Clear it. Set the due window to Last day: the empty state offers a way back to all time, distinct from a queue you have fully cleared.

## Manual checklist

- [ ] Deployed flow: Render service from this repo, build and start commands as above, `/` returns the desk
- [ ] Reload: record a payment, refresh, amounts and queue match
- [ ] Invalid input: follow-up or confirm-details with an empty note is rejected; a payment above remaining is rejected
- [ ] Rule boundaries: Aster’s dispute and route-to-AM differ from Brook’s first follow-up; Crest (future promise) differs from Dune (broken); Grove cannot be “cleared” by a follow-up alone; resolve does not increase Paid total; full payment removes the invoice from the queue

## What remains untested

- The Render deploy itself (no service has been created here)
- Screen-reader pass beyond labeled controls and keyboard rows
- Two browsers editing one session on purpose, past the revision conflict the API already returns
- Disk survival across a real Render restart
- Anything that needs a bank, a mailbox, or a second user

## AI contribution

Cursor agents drafted the implementation, the tests, and this write-up. I directed the product decisions: priority tiers instead of scores, partial payments in scope, resolve is not paid, Grove’s unverified details are an operator action, and the desk is a morning queue rather than a generic admin screen. Edit this note before you send the repo.
