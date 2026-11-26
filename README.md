# invoice-collections-desk

Public take-home repo for an Invoice Collections Desk. **Product build is paused** while planning with Matt Pocock skills (`grill-with-docs`).

## Settled so far

- Tracker: GitHub Issues · Agent file: [`AGENTS.md`](AGENTS.md)
- Persistence: SQLite + cookie sessions
- Partials: **in scope**; cash only via explicit payment received
- Outcome: morning actions that keep queue state honest

## What's here now

- **Matt Pocock skills** under [`.agents/skills/`](.agents/skills/) ([`skills-lock.json`](skills-lock.json))
- **Agent config**: [`AGENTS.md`](AGENTS.md), [`docs/agents/`](docs/agents/)
- **Domain docs**: [`docs/adr/`](docs/adr/) reserved; `GLOSSARY.md` on next grill write pass

## Local note

```sh
npx skills@latest add mattpocock/skills -a cursor -y --skill '*'
```

## Next

More grill answers in the Project chat → glossary/ADR write pass → then spec/tickets/implement when told. No desk implementation until then.
