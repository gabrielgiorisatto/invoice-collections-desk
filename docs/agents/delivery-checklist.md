# Delivery acceptance (take-home)

When implementing (only after Gabriel says go), the submission must cover:

| Requirement | Notes |
|-------------|--------|
| Public deploy + public repo | New Render Web Service from this repo; README links both |
| Seeded flow zero-config | Demo day seeds; clone → install → run works without secrets |
| Context + decision + confirmation | Operator sees why an invoice is shown, chooses an action, sees confirmation |
| Meaningful exception | At least one path that is not the happy path (validation error, empty filter, disputed vs chase, etc.) |
| Empty / no-match states | Filters and all-cleared queue |
| a11y | Labeled controls, keyboard use, form validation messages |
| Usable core over branding | Finance-ops desk; **Today’s 3** first — polish does not replace workflow |
| Reload persistence | SQLite + cookie session survives refresh |
| AM simulation labeled | Route to AM is clearly a labeled simulation |
| Synthetic data | No real bank/CRM; state assumptions in README |
| README | Buyer, user, outcome, trade-off, metric, left out, setup, tests, limitations, reviewer walkthrough, AI ownership, manual checklist, what was left untested |

Do **not** require GitHub triage label creation for this solo take-home workflow (see `triage-labels.md`).
