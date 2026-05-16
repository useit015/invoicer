export function printHelp() {
  process.stdout.write(`invoicer

Professional, agent-friendly invoice CLI inspired by Invoicely.

Usage:
  invoicer schema --json
  invoicer config get --json
  invoicer config set currency USD --json
  invoicer theme list --json
  invoicer theme show <name> --json

  invoicer client create --name "Acme Co" [--email billing@example.com] [--address "..."] [--field "VAT=..."] --json
  invoicer client list --json
  invoicer client get <id> --json
  invoicer client delete <id> --json

  invoicer item create --name "Consulting" --unit-price 125 [--description "..."] [--sku CONSULT] --json
  invoicer item list --json
  invoicer item get <id> --json
  invoicer item delete <id> --json

  invoicer invoice init [--theme name] [--currency USD] [--out invoice.json] --json
  invoicer invoice validate <invoice.json> --json
  invoicer invoice total <invoice.json> --json
  invoicer invoice render <invoice.json> --format html|pdf [--theme name] --out invoice.html --json
  invoicer invoice create <invoice.json> [--store .invoicer/invoices.json] --json
  invoicer invoice list [--store .invoicer/invoices.json] --json
  invoicer invoice get <id> [--store .invoicer/invoices.json] --json
  invoicer invoice edit <id> <invoice.json> [--store .invoicer/invoices.json] --json
  invoicer invoice delete <id> [--store .invoicer/invoices.json] --json
  invoicer invoice status <id> <pending|success|error|expired|refunded> [--store .invoicer/invoices.json] --json

  invoicer asset upload --type logo|signature --file image.png [--asset-store .invoicer/assets.json] --json
  invoicer asset list [--asset-store .invoicer/assets.json] --json
  invoicer asset delete <id> [--asset-store .invoicer/assets.json] --json

  invoicer data export --out backup.json --json
  invoicer data import backup.json --json
`);
}
