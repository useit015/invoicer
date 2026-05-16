---
name: invoicer-cli
description: Use when an agent needs to create, validate, store, update, or render invoices with the local invoicer CLI.
---

# Invoicer CLI

Use this skill from the repository root.

## First Checks

Run:

```bash
npm test
npm run pack:check
node src/cli.js schema --json
node src/cli.js config get --json
node src/cli.js theme list --json
```

If tests fail, stop and fix the CLI before relying on generated invoice data.

## Common Agent Workflow

1. Create or inspect an invoice JSON file.
2. Optionally create reusable client and item records:

```bash
node src/cli.js client create --name "Acme Co" --email billing@acme.example --json
node src/cli.js item create --name "Consulting" --unit-price 125 --json
node src/cli.js invoice compose --client <client-id> --item <item-id-or-sku:2> --out .invoicer/composed.json --json
```

3. Validate it:

```bash
node src/cli.js invoice validate path/to/invoice.json --json
```

4. Calculate totals:

```bash
node src/cli.js invoice total path/to/invoice.json --json
```

5. Render a reviewable invoice:

```bash
node src/cli.js invoice render path/to/invoice.json --format html --theme executive --out .invoicer/invoice.html --json
node src/cli.js invoice render path/to/invoice.json --format pdf --theme executive --out .invoicer/invoice.pdf --json
```

6. Use explicit store paths for automated CRUD and backups:

```bash
node src/cli.js invoice create path/to/invoice.json --store .invoicer/agent-run.json --json
node src/cli.js invoice list --store .invoicer/agent-run.json --json
node src/cli.js report summary --store .invoicer/agent-run.json --json
node src/cli.js data export --store .invoicer/agent-run.json --out .invoicer/agent-backup.json --json
```

## Rules

- Always pass `--json` in automation.
- Treat exit code `2` as validation failure with actionable `issues`.
- Use explicit `--store` and `--asset-store` paths in tests or agent runs.
- Also use explicit `--client-store`, `--item-store`, and `--config` when creating reusable records in tests.
- Discover themes with `theme list --json`; do not hardcode a theme name before checking the list.
- Use `--format pdf` for document output and `--format html` for easy inspection.
- Do not assume PNG support yet.
