# Agent instructions

This repo is configured for Matt Pocock engineering skills (Cursor). **Do not** start `/implement`, `/tdd`, or desk UI/domain code until Gabriel explicitly says to leave grill and implement.

## Settled (grill so far — provisional until glossary/ADR write pass)

| Topic | Decision |
|-------|----------|
| Issue tracker | GitHub Issues on this repo (`gh`) |
| Agent instruction file | `AGENTS.md` (not `CLAUDE.md`) |
| Session persistence | SQLite blob + HTTP-only cookie sessions (same shape as prior workbench) |
| Partial payments | **In scope** (override earlier “out of scope” plan text) |
| Product outcome | Morning actions that keep **queue state honest**; cash only via explicit **payment received** (full or partial) |
| Domain docs layout | Single-context: root `GLOSSARY.md` + `docs/adr/` (create/update on grill write passes, not invent mid-chat) |

Still grilling — more answers pending before glossary/ADR write and before implement.

## Agent skills

### Issue tracker

GitHub Issues on `gabrielgiorisatto/invoice-collections-desk` via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

Note: creating non-default labels via this environment’s `gh` token may 403; Gabriel may need to create `needs-triage`, `needs-info`, `ready-for-agent`, and `ready-for-human` in the GitHub UI if missing. Default `wontfix` already exists.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

`GLOSSARY.md` is created on the next grill **write pass** with settled terms — do not invent a glossary ahead of that pass.
