# invoice-collections-desk

Public take-home repo for an Invoice Collections Desk. **Product build is paused** while planning with Matt Pocock skills (`grill-with-docs`).

## Settled so far

- Tracker: GitHub Issues · Agent file: [`AGENTS.md`](AGENTS.md)
- Persistence: SQLite + cookie sessions
- Partials: **in scope**; cash only via explicit payment received
- Ranking: priority tiers P0–P3 ([ADR-0001](docs/adr/0001-priority-tiers-not-points.md)); payments do not consume follow-up slots
- UI: professional finance-ops desk; first viewport = Today’s 3

## What's here now

- **Matt Pocock skills** under [`.agents/skills/`](.agents/skills/) ([`skills-lock.json`](skills-lock.json))
- **Agent config**: [`AGENTS.md`](AGENTS.md), [`docs/agents/`](docs/agents/)
- **Domain docs**: [`GLOSSARY.md`](GLOSSARY.md), [`docs/adr/`](docs/adr/)

## Local note

```sh
npx skills@latest add mattpocock/skills -a cursor -y --skill '*'
```

## Next

More grill in the Project chat → further glossary/ADR updates → then spec/tickets/implement when told. No desk implementation until then.
