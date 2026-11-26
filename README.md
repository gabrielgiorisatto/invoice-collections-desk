# invoice-collections-desk

Public take-home repo for an Invoice Collections Desk. **Product build paused** — grill nearly closed; wait for Gabriel before `/to-spec` / implement.

## Settled so far

- Tracker: GitHub Issues (no triage labels required) · [`AGENTS.md`](AGENTS.md)
- Persistence: SQLite + cookie sessions
- Partials in scope; **Resolve ≠ paid** ([ADR-0002](docs/adr/0002-resolve-is-not-paid.md))
- Ranking: P0–P3 ([ADR-0001](docs/adr/0001-priority-tiers-not-points.md)); East P1 backfills Today’s 3 only if no P0
- Metric: sum(payments) vs count(follow-ups) ([ADR-0003](docs/adr/0003-proposed-recovery-metric.md)); payments/resolve do not consume morning slots
- UI: finance-ops desk; Today’s 3 first
- Delivery bar: [`docs/agents/delivery-checklist.md`](docs/agents/delivery-checklist.md)

## What's here now

- Skills: [`.agents/skills/`](.agents/skills/) · [`skills-lock.json`](skills-lock.json)
- Domain: [`GLOSSARY.md`](GLOSSARY.md) · [`docs/adr/`](docs/adr/)
- Agent config: [`AGENTS.md`](AGENTS.md) · [`docs/agents/`](docs/agents/)

## Next

Gabriel says go → `/to-spec` → `/to-tickets` → implement. Until then: docs only.
