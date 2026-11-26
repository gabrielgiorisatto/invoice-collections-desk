# Action lifecycle matrix

Operator **ActionKind**s are gated by invoice state via `availableActions(invoice)`, enforced in `applyChange` (server and domain). Paid / resolved invoices have no actions.

| State | Allowed actions |
|-------|-----------------|
| Open / never contacted | follow-up, promise, dispute, verify-accuracy (+ payment if Remaining > 0) |
| Broken promise | follow-up, promise, payment |
| Active promise | payment, resolve only |
| Unverified InvoiceAccuracy | verify-accuracy, dispute (+ payment if Remaining > 0) |
| Open dispute | dispute, route-am, resolve (+ payment if Remaining > 0) |
| Paid or resolved | none |

UI must only offer actions in this set. Primary action is the first preferred kind for the state. Route to AM remains a labeled simulation.
