# Invoicer CLI Agent Handoff

## Goal

Use this CLI to inspect, validate, store, update, and render invoice data from a terminal without relying on hidden UI state.

## Verified Command Surface

Run these from the repository root:

```bash
npm test
npm run pack:check
node src/cli.js schema --json
node src/cli.js config get --json
node src/cli.js theme list --json
node src/cli.js client create --name "Acme Co" --email billing@acme.example --json
node src/cli.js item create --name "Consulting" --unit-price 125 --json
node src/cli.js invoice init --json
node src/cli.js invoice compose --client <client-id> --item <item-id-or-sku:2> --out .invoicer/composed.json --json
node src/cli.js invoice validate examples/invoice.sample.json --json
node src/cli.js invoice total examples/invoice.sample.json --json
node src/cli.js invoice render examples/invoice.sample.json --format html --theme executive --out .invoicer/sample.html --json
node src/cli.js invoice render examples/invoice.sample.json --format pdf --theme executive --out .invoicer/sample.pdf --json
```

## Data Contract

The canonical invoice file mirrors the reference Invoicely create flow:

- `companyDetails`: name, address, optional logo/signature, arbitrary metadata pairs.
- `clientDetails`: name, address, arbitrary metadata pairs.
- `invoiceDetails`: theme, currency, prefix, serial number, issue date, optional due date, payment terms, billing adjustments.
- `items`: invoice line items with name, description, quantity, and unit price.
- `metadata`: notes, terms, and payment information pairs.

Use `node src/cli.js schema --json` for the machine-readable contract and `examples/invoice.sample.json` for a fixture.

## Workflow Stores

The app uses local JSON stores:

- invoices: `.invoicer/invoices.json`
- assets: `.invoicer/assets.json`
- clients: `.invoicer/clients.json`
- catalog items: `.invoicer/items.json`
- config: `.invoicer/config.json`

Use explicit `--store`, `--asset-store`, `--client-store`, `--item-store`, and `--config` paths in tests or agent runs.

## Business Workflows

Create reusable client and catalog entries:

```bash
node src/cli.js client create --name "Acme Co" --email billing@acme.example --field "VAT=EU123" --json
node src/cli.js item create --sku CONSULT --name "Consulting" --unit-price 125 --json
node src/cli.js invoice compose --client <client-id> --item CONSULT:2 --out .invoicer/composed.json --json
```

Back up and restore local data:

```bash
node src/cli.js data export --out .invoicer/backup.json --json
node src/cli.js data import .invoicer/backup.json --json
```

Summarize stored invoices:

```bash
node src/cli.js report summary --store .invoicer/invoices.json --json
```

## Themes

Use `node src/cli.js theme list --json` to discover built-in themes. Current theme names are:

```text
default
vercel
executive
ledger
studio
minimal
aurora
```

Use `invoice init --theme <name>` when creating a new invoice fixture, or `invoice render --theme <name>` to render an existing invoice with a different professional look without changing the source file.

## Storage

Invoice CRUD commands use a local JSON store. Pass `--store <path>` in automated runs so agents avoid polluting a user's default `.invoicer/invoices.json`.

Asset commands use `--asset-store <path>` or derive an asset store from `--store`. Logo assets are limited to 400 KB and signature assets to 150 KB, matching the reference server constraints.

## Exit Codes

- `0`: success.
- `1`: command, file, store, or runtime error.
- `2`: invoice validation failed.

Structured errors look like:

```json
{"ok":false,"error":{"code":"invoice_invalid","message":"Invoice validation failed.","issues":[]}}
```

## Known Parity Gaps

- PNG rendering is not implemented yet; the CLI writes deterministic themed HTML and dependency-free themed PDF.
- Server-backed storage, authentication, and Cloudflare R2 are not implemented.
- The web dashboard is not implemented because the local repo started blank.

Recommended next slices:

1. Add browser-backed PNG capture behind the existing `invoice render` contract.
2. Add server/database storage behind the existing storage abstraction.
3. Add richer reporting, such as aging buckets and CSV export.
