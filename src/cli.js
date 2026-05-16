#!/usr/bin/env node
import { CliError } from "./errors.js";
import { readJsonFile, resolveFromCwd, writeJsonFile, writeTextFile } from "./io.js";
import { renderInvoiceHtml } from "./render.js";
import {
  calculateInvoiceTotals,
  createDefaultInvoice,
  invoiceSchemaContract,
  validateInvoice,
} from "./schema.js";
import {
  createInvoice,
  deleteAsset,
  deleteInvoice,
  editInvoice,
  getInvoice,
  listAssets,
  listInvoices,
  updateInvoiceStatus,
  uploadAsset,
} from "./storage.js";

const { command, args, options } = parseArgv(process.argv.slice(2));

try {
  await main(command, args, options);
} catch (error) {
  handleError(error, options);
}

async function main(commandName, args, opts) {
  if (!commandName || commandName === "help" || opts.help) {
    printHelp();
    return;
  }

  if (commandName === "schema") {
    return output({ ok: true, schema: invoiceSchemaContract() }, opts);
  }

  if (commandName === "invoice") {
    return invoiceCommand(args, opts);
  }

  if (commandName === "asset") {
    return assetCommand(args, opts);
  }

  throw new CliError("unknown_command", `Unknown command: ${commandName}`);
}

async function invoiceCommand(args, opts) {
  const action = args[0];

  switch (action) {
    case "init": {
      const invoice = createDefaultInvoice();
      if (opts.out) {
        await writeJsonFile(resolveFromCwd(opts.out), invoice);
      }
      return output({ ok: true, invoice, outputPath: opts.out ? resolveFromCwd(opts.out) : null }, opts);
    }

    case "validate": {
      const invoice = await readInvoiceArg(args[1]);
      const validation = validateInvoice(invoice);
      if (!validation.valid) {
        throw new CliError("invoice_invalid", "Invoice validation failed.", { issues: validation.issues });
      }
      return output({ ok: true, valid: true, issues: [] }, opts);
    }

    case "total": {
      const invoice = await readValidInvoiceArg(args[1]);
      return output({ ok: true, totals: calculateInvoiceTotals(invoice) }, opts);
    }

    case "render": {
      const invoice = await readValidInvoiceArg(args[1]);
      const format = opts.format ?? "html";
      if (format !== "html") {
        throw new CliError("unsupported_format", "Only html rendering is available in this milestone.");
      }
      const html = renderInvoiceHtml(invoice);
      if (opts.out) {
        await writeTextFile(resolveFromCwd(opts.out), html);
        return output({ ok: true, format, outputPath: resolveFromCwd(opts.out), totals: calculateInvoiceTotals(invoice) }, opts);
      }
      if (opts.json) {
        return output({ ok: true, format, html, totals: calculateInvoiceTotals(invoice) }, opts);
      }
      process.stdout.write(html);
      return;
    }

    case "create": {
      const invoice = await readValidInvoiceArg(args[1]);
      const summary = await createInvoice(invoice, storeOptions(opts));
      return output({ ok: true, invoice: summary }, opts);
    }

    case "list": {
      const invoices = await listInvoices(storeOptions(opts));
      return output({ ok: true, invoices, count: invoices.length }, opts);
    }

    case "get": {
      requireArg(args[1], "invoice id");
      const invoice = await getInvoice(args[1], storeOptions(opts));
      return output({ ok: true, invoice }, opts);
    }

    case "edit": {
      requireArg(args[1], "invoice id");
      const invoice = await readValidInvoiceArg(args[2]);
      const summary = await editInvoice(args[1], invoice, storeOptions(opts));
      return output({ ok: true, invoice: summary }, opts);
    }

    case "delete": {
      requireArg(args[1], "invoice id");
      const summary = await deleteInvoice(args[1], storeOptions(opts));
      return output({ ok: true, invoice: summary }, opts);
    }

    case "status": {
      requireArg(args[1], "invoice id");
      requireArg(args[2], "status");
      const summary = await updateInvoiceStatus(args[1], args[2], storeOptions(opts));
      return output({ ok: true, invoice: summary }, opts);
    }

    default:
      throw new CliError("unknown_invoice_command", `Unknown invoice command: ${action ?? ""}`);
  }
}

async function assetCommand(args, opts) {
  const action = args[0];

  switch (action) {
    case "upload": {
      requireOption(opts.type, "--type");
      requireOption(opts.file, "--file");
      const asset = await uploadAsset({
        type: opts.type,
        filePath: resolveFromCwd(opts.file),
        storePath: assetStorePath(opts),
      });
      return output({ ok: true, asset }, opts);
    }

    case "list": {
      const assets = await listAssets({ storePath: assetStorePath(opts) });
      return output({ ok: true, assets, count: assets.length }, opts);
    }

    case "delete": {
      requireArg(args[1], "asset id");
      const asset = await deleteAsset(args[1], { storePath: assetStorePath(opts) });
      return output({ ok: true, asset }, opts);
    }

    default:
      throw new CliError("unknown_asset_command", `Unknown asset command: ${action ?? ""}`);
  }
}

async function readInvoiceArg(filePath) {
  requireArg(filePath, "invoice JSON file");
  return readJsonFile(resolveFromCwd(filePath));
}

async function readValidInvoiceArg(filePath) {
  const invoice = await readInvoiceArg(filePath);
  const validation = validateInvoice(invoice);

  if (!validation.valid) {
    throw new CliError("invoice_invalid", "Invoice validation failed.", { issues: validation.issues });
  }

  return invoice;
}

function storeOptions(opts) {
  return opts.store ? { storePath: resolveFromCwd(opts.store) } : {};
}

function assetStorePath(opts) {
  if (opts.assetStore) return resolveFromCwd(opts.assetStore);
  if (opts.store) return resolveFromCwd(opts.store.replace(/\.json$/u, ".assets.json"));
  return undefined;
}

function output(value, opts) {
  if (opts.json || opts.pretty) {
    process.stdout.write(`${JSON.stringify(value, null, opts.pretty ? 2 : 0)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function handleError(error, opts) {
  const code = error instanceof CliError ? error.code : "unexpected_error";
  const message = error instanceof Error ? error.message : String(error);
  const details = error instanceof CliError ? error.details : {};
  const payload = {
    ok: false,
    error: {
      code,
      message,
      ...details,
    },
  };

  if (opts.json || opts.pretty) {
    process.stderr.write(`${JSON.stringify(payload, null, opts.pretty ? 2 : 0)}\n`);
  } else {
    process.stderr.write(`${code}: ${message}\n`);
  }

  process.exitCode = code === "invoice_invalid" ? 2 : 1;
}

function parseArgv(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = toCamel(rawKey);

    if (["json", "pretty", "help"].includes(key)) {
      options[key] = true;
      continue;
    }

    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new CliError("missing_option_value", `Missing value for --${rawKey}.`);
    }

    options[key] = value;
    if (inlineValue === undefined) index += 1;
  }

  return {
    command: positional[0],
    args: positional.slice(1),
    options,
  };
}

function toCamel(value) {
  return value.replace(/-([a-z])/gu, (_, char) => char.toUpperCase());
}

function requireArg(value, label) {
  if (!value) {
    throw new CliError("missing_argument", `Missing ${label}.`);
  }
}

function requireOption(value, label) {
  if (!value) {
    throw new CliError("missing_option", `Missing ${label}.`);
  }
}

function printHelp() {
  process.stdout.write(`invoicer

Agent-friendly invoice CLI inspired by Invoicely.

Usage:
  invoicer schema --json
  invoicer invoice init [--out invoice.json] --json
  invoicer invoice validate <invoice.json> --json
  invoicer invoice total <invoice.json> --json
  invoicer invoice render <invoice.json> --format html --out invoice.html --json
  invoicer invoice create <invoice.json> [--store .invoicer/invoices.json] --json
  invoicer invoice list [--store .invoicer/invoices.json] --json
  invoicer invoice get <id> [--store .invoicer/invoices.json] --json
  invoicer invoice edit <id> <invoice.json> [--store .invoicer/invoices.json] --json
  invoicer invoice delete <id> [--store .invoicer/invoices.json] --json
  invoicer invoice status <id> <pending|success|error|expired|refunded> [--store .invoicer/invoices.json] --json
  invoicer asset upload --type logo|signature --file image.png [--asset-store .invoicer/assets.json] --json
  invoicer asset list [--asset-store .invoicer/assets.json] --json
  invoicer asset delete <id> [--asset-store .invoicer/assets.json] --json
`);
}
