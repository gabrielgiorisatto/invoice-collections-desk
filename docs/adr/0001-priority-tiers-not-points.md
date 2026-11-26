# Priority tiers (P0–P3), not point scores

Collections ranking uses **explainable priority tiers** derived from typed enums (`PromiseStatus`, `DisputeStatus`, `InvoiceAccuracy`, `OwnerRole`, `Settlement` / **Remaining**). We explicitly **reject** free-text ranks and numeric point-scoring (no weighted “AI scores” or predicted pay likelihood).

## Tiers

| Tier | Meaning | Rule (first match wins downward) |
|------|---------|----------------------------------|
| **P0** | Preferred **Today’s 3** candidates | Fixed order: (1) `PromiseStatus=broken` → (2) never contacted **and** no open dispute → (3) `InvoiceAccuracy=unverified_claim` |
| **P1** | Other-actor / dispute; queue always; morning backfill only | Unanswered follow-ups ≥ 2 with AM available (e.g. East), **or** `DisputeStatus=open` (e.g. Aster) |
| **P2** | Wait / monitor | `PromiseStatus=active` |
| **P3** | Settled for chase | **Remaining** = 0 (or removed via **Resolve** — see ADR-0002) |

Within a tier, tie-break by larger **Remaining**, then more days overdue.

## Today’s 3 fill order

1. Take **P0** in the fixed order above, up to **MorningCapacity** (3).
2. If fewer than 3 **P0** candidates remain, **backfill from P1** (East/Aster-class) until the cap — P1 never displaces an available P0.
3. **P2** / **P3** are never auto-picked for morning slots.

Seed expectation with a full P0 set: Dune, Brook, Grove. East and Aster stay **P1** (visible in queue; enter **Today’s 3** only when P0 is exhausted). Crest → P2.

## Rejected alternative

**Point / score models** (points for age, amount, days-since-contact, etc.) look precise but hide judgment and read as predictions. Tiers stay auditable: each pick maps to one enum rule the reviewer can check.

## UI consequence

The product is a **professional finance-ops desk**, not a marketing dashboard: first viewport focuses **Today’s 3** with human one-line reasons; queue and detail support that morning job. Prefer usable core over branding polish.
