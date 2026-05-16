# Invoicer CLI

Agent-friendly invoice CLI inspired by [`legions-developer/invoicely`](https://github.com/legions-developer/invoicely).

This app focuses on the parts an agent can operate safely from a terminal: a canonical invoice JSON contract, validation, total calculation, local JSON-backed invoice records, reusable clients, reusable catalog items, config defaults, import/export backups, local asset registry commands, professional invoice themes, HTML/PDF rendering, tests, package checks, and handoff documentation.

## Quick Start

```bash
npm test
npm run pack:check
node src/cli.js schema --json
node src/cli.js config get --json
node src/cli.js theme list --json
node src/cli.js client create --name "Acme Co" --email billing@acme.example --json
node src/cli.js item create --name "Consulting" --unit-price 125 --json
node src/cli.js invoice compose --client <client-id> --item <item-id-or-sku:2> --out .invoicer/composed.json --json
node src/cli.js invoice validate examples/invoice.sample.json --json
node src/cli.js invoice total examples/invoice.sample.json --json
node src/cli.js invoice render examples/invoice.sample.json --format html --theme executive --out .invoicer/sample.html --json
node src/cli.js invoice render examples/invoice.sample.json --format pdf --theme executive --out .invoicer/sample.pdf --json
```

## Themes

Built-in themes:

```text
default    Classic Violet
vercel     Vercel Mono
executive  Executive Slate
ledger     Ledger Green
studio     Studio Coral
minimal    Minimal Ink
aurora     Aurora Blue
```

Discover themes from automation:

```bash
node src/cli.js theme list --json
node src/cli.js theme show executive --json
node src/cli.js invoice init --theme ledger --currency EUR --out .invoicer/ledger.json --json
```

## Core Commands

Config:

```bash
node src/cli.js config get --json
node src/cli.js config set currency EUR --json
node src/cli.js config set theme ledger --json
```

Clients:

```bash
node src/cli.js client create --name "Acme Co" --email billing@acme.example --address "44 Client Ave" --field "VAT=EU123" --json
node src/cli.js client list --json
node src/cli.js client get <id> --json
node src/cli.js client delete <id> --json
```

Catalog items:

```bash
node src/cli.js item create --sku CONSULT --name "Consulting" --description "Hourly consulting" --unit-price 125 --json
node src/cli.js item list --json
node src/cli.js item get CONSULT --json
node src/cli.js item delete CONSULT --json
```

Invoices:

```bash
node src/cli.js invoice init --out .invoicer/new-invoice.json --json
node src/cli.js invoice compose --client <client-id> --item CONSULT:2 --company-name "Northstar Studio" --out .invoicer/composed.json --json
node src/cli.js invoice init --theme studio --base-color "#e0523f" --out .invoicer/studio.json --json
node src/cli.js invoice create examples/invoice.sample.json --store .invoicer/invoices.json --json
node src/cli.js invoice list --store .invoicer/invoices.json --json
node src/cli.js invoice get <id> --store .invoicer/invoices.json --json
node src/cli.js invoice status <id> success --store .invoicer/invoices.json --json
node src/cli.js invoice edit <id> examples/invoice.sample.json --store .invoicer/invoices.json --json
node src/cli.js invoice delete <id> --store .invoicer/invoices.json --json
```

Asset registry commands:

```bash
node src/cli.js asset upload --type logo --file ./logo.png --asset-store .invoicer/assets.json --json
node src/cli.js asset list --asset-store .invoicer/assets.json --json
node src/cli.js asset delete <id> --asset-store .invoicer/assets.json --json
```

Data backup:

```bash
node src/cli.js data export --out .invoicer/backup.json --json
node src/cli.js data import .invoicer/backup.json --json
```

Reports:

```bash
node src/cli.js report summary --store .invoicer/invoices.json --json
```

## Agent Contract

All commands support `--json`. Validation failures exit with code `2` and include field-level `issues`. Other command failures exit with code `1` and include a stable error `code`.

Rendering supports deterministic HTML and dependency-free PDF output. Use `--theme <name>` to preview a different theme without mutating the invoice JSON. PNG remains a future parity target.

See [docs/agent-handoff.md](docs/agent-handoff.md) and [skills/invoicer-cli/SKILL.md](skills/invoicer-cli/SKILL.md).

## Architecture

The CLI entrypoint is intentionally thin:

- `src/cli.js` parses top-level commands and dispatches to command modules.
- `src/commands/` contains workflow commands for invoices, themes, assets, config, clients, catalog items, and data backup.
- `src/commands/report.js` summarizes stored invoices for quick operational review.
- `src/storage.js` owns local JSON stores and import/export.
- `src/schema.js`, `src/themes.js`, and `src/render.js` own invoice contracts and output generation.
