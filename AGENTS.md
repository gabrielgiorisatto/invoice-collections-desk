# Agent instructions

This repo is configured for Matt Pocock engineering skills (Cursor). **Do not** start `/to-spec`, `/to-tickets`, `/implement`, or `/tdd` for the desk until Gabriel explicitly says go.

## Settled (grill nearly closed)

| Topic | Decision |
|-------|----------|
| Issue tracker | GitHub Issues via `gh` — **no triage label create required** |
| Agent instruction file | `AGENTS.md` |
| Session persistence | SQLite blob + HTTP-only cookie sessions |
| Partial payments | **In scope**; cash only via explicit **payment received** |
| **Resolve** | Leaves queue; needs **ResolutionReason** + note; **≠ paid** / not cash ([ADR-0002](docs/adr/0002-resolve-is-not-paid.md)) |
| Ranking | Priority tiers P0–P3, not points ([ADR-0001](docs/adr/0001-priority-tiers-not-points.md)); East is **P1**, fills **Today’s 3** only when no P0 left |
| Morning slots | **MorningCapacity** = 3; payments and **Resolve** do **not** consume slots |
| Metric | `sum(payments)` vs `count(follow-ups)` ([ADR-0003](docs/adr/0003-proposed-recovery-metric.md)) |
| UI | Professional finance-ops desk; **Today’s 3** first; usable core over branding |
| Delivery bar | See [`docs/agents/delivery-checklist.md`](docs/agents/delivery-checklist.md) |

## Agent skills

### Issue tracker

GitHub Issues on `gabrielgiorisatto/invoice-collections-desk` via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

**Optional / unused for this take-home.** Do not create labels or block on them. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root [`GLOSSARY.md`](GLOSSARY.md) + [`docs/adr/`](docs/adr/). See `docs/agents/domain.md`. Use glossary terms; flag ADR conflicts explicitly.
