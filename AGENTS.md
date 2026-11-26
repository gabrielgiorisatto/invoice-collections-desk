# Agent instructions

This repo is configured for Matt Pocock engineering skills (Cursor). **Do not** start `/implement`, `/tdd`, or desk UI/domain code until Gabriel explicitly says to leave grill and implement.

## Settled (grill write passes so far)

| Topic | Decision |
|-------|----------|
| Issue tracker | GitHub Issues on this repo (`gh`) |
| Agent instruction file | `AGENTS.md` (not `CLAUDE.md`) |
| Session persistence | SQLite blob + HTTP-only cookie sessions |
| Partial payments | **In scope**; cash only via explicit **payment received** (full or partial) |
| Product outcome | Morning actions that keep **queue state honest** |
| Domain docs | Single-context `GLOSSARY.md` + `docs/adr/` |
| Ranking | **Priority tiers P0–P3** from typed enums — **not** point scores ([ADR-0001](docs/adr/0001-priority-tiers-not-points.md)) |
| Morning slots | **MorningCapacity** = 3; payments do **not** consume a **Follow-up slot** |
| UI direction | Professional finance-ops desk; first viewport = **Today’s 3** |

Still grilling further product/engineering questions before implement.

## Agent skills

### Issue tracker

GitHub Issues on `gabrielgiorisatto/invoice-collections-desk` via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

Note: creating non-default labels via this environment’s `gh` token may 403; Gabriel may need to create missing labels in the GitHub UI. Default `wontfix` already exists.

### Domain docs

Single-context: root [`GLOSSARY.md`](GLOSSARY.md) + [`docs/adr/`](docs/adr/). See `docs/agents/domain.md`. Use glossary terms in issues, tickets, and code names; flag ADR conflicts explicitly.
