# Invoicer CLI

Agent-friendly invoice CLI inspired by [`legions-developer/invoicely`](https://github.com/legions-developer/invoicely).

This first milestone focuses on the parts an agent can operate safely from a terminal: a canonical invoice JSON contract, validation, total calculation, local JSON-backed invoice records, local asset registry commands, HTML rendering, tests, and handoff documentation.

## Quick Start

```bash
npm test
node src/cli.js schema --json
node src/cli.js invoice validate examples/invoice.sample.json --json
node src/cli.js invoice total examples/invoice.sample.json --json
node src/cli.js invoice render examples/invoice.sample.json --format html --out .invoicer/sample.html --json
node src/cli.js invoice render examples/invoice.sample.json --format pdf --out .invoicer/sample.pdf --json
```

## Core Commands

```bash
node src/cli.js invoice init --out .invoicer/new-invoice.json --json
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

## Agent Contract

All commands support `--json`. Validation failures exit with code `2` and include field-level `issues`. Other command failures exit with code `1` and include a stable error `code`.

Rendering supports deterministic HTML and dependency-free PDF output. PNG remains a future parity target.

See [docs/agent-handoff.md](docs/agent-handoff.md) and [skills/invoicer-cli/SKILL.md](skills/invoicer-cli/SKILL.md).
