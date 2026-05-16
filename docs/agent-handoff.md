# Invoicer CLI Agent Handoff

## Goal

Use this CLI to inspect, validate, store, update, and render invoice data from a terminal without relying on hidden UI state.

## Verified Command Surface

Run these from the repository root:

```bash
npm test
node src/cli.js schema --json
node src/cli.js invoice init --json
node src/cli.js invoice validate examples/invoice.sample.json --json
node src/cli.js invoice total examples/invoice.sample.json --json
node src/cli.js invoice render examples/invoice.sample.json --format html --out .invoicer/sample.html --json
```

## Data Contract

The canonical invoice file mirrors the reference Invoicely create flow:

- `companyDetails`: name, address, optional logo/signature, arbitrary metadata pairs.
- `clientDetails`: name, address, arbitrary metadata pairs.
- `invoiceDetails`: theme, currency, prefix, serial number, issue date, optional due date, payment terms, billing adjustments.
- `items`: invoice line items with name, description, quantity, and unit price.
- `metadata`: notes, terms, and payment information pairs.

Use `node src/cli.js schema --json` for the machine-readable contract and `examples/invoice.sample.json` for a fixture.

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

- PDF and PNG rendering are not implemented in this milestone; the CLI writes deterministic HTML.
- Server-backed storage, authentication, and Cloudflare R2 are not implemented.
- The web dashboard is not implemented because the local repo started blank.

Recommended next slices:

1. Add PDF rendering or browser-backed PNG capture behind the existing `invoice render` contract.
2. Add server/database storage behind the existing storage abstraction.
3. Add web dashboard parity only after the CLI contract remains stable.
