# Action lifecycle matrix

Operator **ActionKind**s are gated by invoice state via `availableActions(invoice)`, enforced in `applyChange` (server and domain). **State** (promise, dispute, invoice details) is read-only in the UI; **actions** are verbs that change state and append history. Paid / resolved invoices have no actions.

Follow-up is a contact note only — it never sets InvoiceAccuracy to needs verification. Use **Flag details for review** / **Confirm details verified** for accuracy.

| State | Allowed actions |
|-------|-----------------|
| Open / details verified | follow-up, flag-details, promise, dispute (+ payment if Remaining > 0) |
| Broken promise | follow-up, promise, payment |
| Active promise | payment, resolve only |
| Needs verification | confirm-details, dispute (+ payment if Remaining > 0) |
| Open dispute | dispute, route-am, resolve (+ payment if Remaining > 0) |
| Paid or resolved | none |

UI shows the full action set in fixed order; unavailable actions are disabled with a reason. Primary action is the first preferred kind for the state. Route to AM remains a labeled simulation.
