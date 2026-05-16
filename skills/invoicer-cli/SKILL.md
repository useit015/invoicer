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
node src/cli.js schema --json
```

If tests fail, stop and fix the CLI before relying on generated invoice data.

## Common Agent Workflow

1. Create or inspect an invoice JSON file.
2. Validate it:

```bash
node src/cli.js invoice validate path/to/invoice.json --json
```

3. Calculate totals:

```bash
node src/cli.js invoice total path/to/invoice.json --json
```

4. Render a reviewable HTML invoice:

```bash
node src/cli.js invoice render path/to/invoice.json --format html --out .invoicer/invoice.html --json
```

5. Use an explicit store path for automated CRUD:

```bash
node src/cli.js invoice create path/to/invoice.json --store .invoicer/agent-run.json --json
node src/cli.js invoice list --store .invoicer/agent-run.json --json
```

## Rules

- Always pass `--json` in automation.
- Treat exit code `2` as validation failure with actionable `issues`.
- Use explicit `--store` and `--asset-store` paths in tests or agent runs.
- Do not assume PDF or PNG support yet; this milestone renders HTML only.
