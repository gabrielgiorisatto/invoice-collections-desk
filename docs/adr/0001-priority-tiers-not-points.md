# Priority tiers (P0–P3), not point scores

Collections ranking uses **explainable priority tiers** derived from typed enums (`PromiseStatus`, `DisputeStatus`, `InvoiceAccuracy`, `OwnerRole`, `Settlement` / **Remaining**). We explicitly **reject** free-text ranks and numeric point-scoring (no weighted “AI scores” or predicted pay likelihood).

## Tiers

| Tier | Meaning | Rule (first match wins downward) |
|------|---------|----------------------------------|
| **P0** | Morning auto-pick candidates for **Today’s 3** | Fixed order: (1) `PromiseStatus=broken` → (2) never contacted **and** no open dispute → (3) `InvoiceAccuracy=unverified_claim` |
| **P1** | Visible in queue; not auto-slotted | Other-actor work: unanswered follow-ups ≥ 2 with AM available, **or** `DisputeStatus=open` |
| **P2** | Wait / monitor | `PromiseStatus=active` |
| **P3** | Settled for chase | **Remaining** = 0 |

Within a tier, tie-break by larger **Remaining**, then more days overdue.

**Today’s 3** takes from **P0** only, in that fixed order, capped by **MorningCapacity** (3). Seed expectation: Dune, Brook, Grove; East/Aster → P1; Crest → P2.

## Rejected alternative

**Point / score models** (points for age, amount, days-since-contact, etc.) look precise but hide judgment and read as predictions. Tiers stay auditable: each pick maps to one enum rule the reviewer can check.

## UI consequence

The product is a **professional finance-ops desk**, not a marketing dashboard: first viewport focuses **Today’s 3** with human one-line reasons; queue and detail support that morning job.
