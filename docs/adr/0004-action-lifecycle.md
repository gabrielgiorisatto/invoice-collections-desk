# Action lifecycle matrix

Operator **ActionKind**s are gated by invoice state via `availableActions(invoice)`, enforced in `applyChange` (server and domain). **State** (promise, dispute, invoice details) is read-only in the UI; **actions** are verbs that change state and append history. Paid / resolved invoices have no actions.

Follow-up is contact only, and it is always available on an active invoice. It never sets InvoiceAccuracy, never records a promise or dispute, and it is not how you route to an account manager.

Each of details, promise, and dispute has **one open item**:

| Item | When none is open | When one is open |
|------|-------------------|------------------|
| Invoice details | **Flag** the single request | **Confirm** or **cancel** only. No second flag. |
| Promise | **Create** the one promise | **Update** that promise or **cancel** it. No second promise on top. |
| Dispute | **Create** the one dispute | **Update** or **cancel**. Allowed even when a promise is broken. The broken promise stays on the invoice and in history. An open dispute is not a cold chase (P1, not the broken-promise P0). |

**Record payment** and **Resolve** without payment are always available on an active invoice and are grouped together in the UI.

**Route to AM** is its own action, not a follow-up. It is available for an open dispute and stays a labeled simulation. It does not append a follow-up.

UI shows every action, in groups, in a fixed order. Unavailable actions stay disabled with a reason. The primary action is the first preferred kind for the state.
