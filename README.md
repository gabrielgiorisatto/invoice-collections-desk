# invoice-collections-desk

Morning **Invoice Collections Desk** for a finance operator. Spec [#1](https://github.com/gabrielgiorisatto/invoice-collections-desk/issues/1); tickets [#2](https://github.com/gabrielgiorisatto/invoice-collections-desk/issues/2)–[#8](https://github.com/gabrielgiorisatto/invoice-collections-desk/issues/8).

## Current slice (#2)

Read-only morning desk: seeds Aster–Grove, priority tiers P0–P3, **Today’s 3**, queue + detail, SQLite cookie session `GET /api/invoices`. Mutating actions land in later tickets.

## Run locally

Node 22+.

```sh
npm ci
npm test
npm run dev    # http://localhost:5173
npm run build && npm start
```

## Domain docs

- [`GLOSSARY.md`](GLOSSARY.md)
- [`docs/adr/`](docs/adr/)
- [`AGENTS.md`](AGENTS.md)
