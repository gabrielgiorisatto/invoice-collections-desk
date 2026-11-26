# invoice-collections-desk

Public take-home repo for an Invoice Collections Desk. **Product build is paused** while planning with Matt Pocock skills.

## What's here now

- **Matt Pocock skills** installed for Cursor under [`.agents/skills/`](.agents/skills/) (lockfile: [`skills-lock.json`](skills-lock.json)).
- **Agent config**: [`AGENTS.md`](AGENTS.md), [`docs/agents/`](docs/agents/) (issue tracker, domain layout, triage labels).
- **Domain docs layout** (empty until `/grill-with-docs` / `/domain-modeling`): `GLOSSARY.md` created lazily; [`docs/adr/`](docs/adr/) reserved for ADRs.

## Local note

```sh
# Skills were installed with:
npx skills@latest add mattpocock/skills -a cursor -y --skill '*'
```

Re-run or update with `npx skills@latest update -p -y` when needed.

## Next

Gabriel continues plan/grill in the Project chat. Do not implement the collections desk UI/domain until instructed.
