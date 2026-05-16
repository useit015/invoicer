import { output, requireArg, assertThemeName, writeBinaryFile } from "../command-utils.js";
import { readJsonFile, resolveFromCwd, writeJsonFile, writeTextFile } from "../io.js";
import { renderInvoiceHtml, renderInvoicePdf } from "../render.js";
import { calculateInvoiceTotals, createDefaultInvoice, THEME_MODES, validateInvoice } from "../schema.js";
import { CliError } from "../errors.js";
import {
  createInvoice,
  deleteInvoice,
  editInvoice,
  getCatalogItem,
  getConfig,
  getClient,
  getInvoice,
  listInvoices,
  updateInvoiceStatus,
} from "../storage.js";

export async function invoiceCommand(args, opts) {
  const action = args[0];

  switch (action) {
    case "init": {
      const config = await getConfig(configOptions(opts));
      const themeName = opts.theme ?? opts.template ?? config.defaults.theme;
      assertThemeName(themeName);
      if (opts.mode && !THEME_MODES.includes(opts.mode)) {
        throw new CliError("invalid_theme_mode", `Theme mode must be one of: ${THEME_MODES.join(", ")}.`);
      }

      const invoice = createDefaultInvoice(new Date(), {
        theme: themeName,
        mode: opts.mode,
        baseColor: opts.baseColor,
        currency: opts.currency ?? config.defaults.currency,
      });
      if (opts.out) {
        await writeJsonFile(resolveFromCwd(opts.out), invoice);
      }
      return output({ ok: true, invoice, outputPath: opts.out ? resolveFromCwd(opts.out) : null }, opts);
    }

    case "compose": {
      requireArg(opts.client, "--client");
      requireArg(opts.item, "--item");
      const config = await getConfig(configOptions(opts));
      const themeName = opts.theme ?? opts.template ?? config.defaults.theme;
      assertThemeName(themeName);
      const client = await getClient(opts.client, clientStoreOptions(opts));
      const itemRefs = Array.isArray(opts.item) ? opts.item : [opts.item];
      const items = await Promise.all(itemRefs.map((reference) => resolveCatalogItem(reference, opts)));
      const invoice = createDefaultInvoice(new Date(), {
        theme: themeName,
        currency: opts.currency ?? config.defaults.currency,
        baseColor: opts.baseColor,
      });

      invoice.companyDetails.name = opts.companyName ?? invoice.companyDetails.name;
      invoice.companyDetails.address = opts.companyAddress ?? invoice.companyDetails.address;
      invoice.clientDetails = {
        name: client.name,
        address: client.address,
        metadata: [
          ...(client.email ? [{ label: "Email", value: client.email }] : []),
          ...(client.phone ? [{ label: "Phone", value: client.phone }] : []),
          ...client.metadata,
        ],
      };
      invoice.invoiceDetails.prefix = opts.prefix ?? invoice.invoiceDetails.prefix;
      invoice.invoiceDetails.serialNumber = opts.serial ?? invoice.invoiceDetails.serialNumber;
      invoice.invoiceDetails.paymentTerms = opts.paymentTerms ?? invoice.invoiceDetails.paymentTerms;
      invoice.invoiceDetails.dueDate = opts.dueDate ?? invoice.invoiceDetails.dueDate;
      invoice.items = items;

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
      const renderOptions = { theme: opts.theme ?? opts.template };
      if (renderOptions.theme) assertThemeName(renderOptions.theme);

      if (!["html", "pdf"].includes(format)) {
        throw new CliError("unsupported_format", "Render format must be html or pdf.");
      }

      if (format === "pdf") {
        const pdf = renderInvoicePdf(invoice, renderOptions);
        if (opts.out) {
          const outputPath = resolveFromCwd(opts.out);
          await writeBinaryFile(outputPath, pdf);
          return output({ ok: true, format, outputPath, byteLength: pdf.byteLength, totals: calculateInvoiceTotals(invoice) }, opts);
        }
        if (opts.json) {
          return output({ ok: true, format, pdfBase64: pdf.toString("base64"), byteLength: pdf.byteLength, totals: calculateInvoiceTotals(invoice) }, opts);
        }
        process.stdout.write(pdf);
        return;
      }

      const html = renderInvoiceHtml(invoice, renderOptions);
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
      const summary = await createInvoice(invoice, invoiceStoreOptions(opts));
      return output({ ok: true, invoice: summary }, opts);
    }

    case "list": {
      const invoices = await listInvoices(invoiceStoreOptions(opts));
      return output({ ok: true, invoices, count: invoices.length }, opts);
    }

    case "get": {
      requireArg(args[1], "invoice id");
      const invoice = await getInvoice(args[1], invoiceStoreOptions(opts));
      return output({ ok: true, invoice }, opts);
    }

    case "edit": {
      requireArg(args[1], "invoice id");
      const invoice = await readValidInvoiceArg(args[2]);
      const summary = await editInvoice(args[1], invoice, invoiceStoreOptions(opts));
      return output({ ok: true, invoice: summary }, opts);
    }

    case "delete": {
      requireArg(args[1], "invoice id");
      const summary = await deleteInvoice(args[1], invoiceStoreOptions(opts));
      return output({ ok: true, invoice: summary }, opts);
    }

    case "status": {
      requireArg(args[1], "invoice id");
      requireArg(args[2], "status");
      const summary = await updateInvoiceStatus(args[1], args[2], invoiceStoreOptions(opts));
      return output({ ok: true, invoice: summary }, opts);
    }

    default:
      throw new CliError("unknown_invoice_command", `Unknown invoice command: ${action ?? ""}`);
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

function configOptions(opts) {
  return opts.config ? { configPath: resolveFromCwd(opts.config) } : {};
}

function invoiceStoreOptions(opts) {
  return opts.store ? { storePath: resolveFromCwd(opts.store) } : {};
}

function clientStoreOptions(opts) {
  return opts.clientStore ? { storePath: resolveFromCwd(opts.clientStore) } : {};
}

function itemStoreOptions(opts) {
  return opts.itemStore ? { storePath: resolveFromCwd(opts.itemStore) } : {};
}

async function resolveCatalogItem(reference, opts) {
  const [idOrSku, quantityRaw] = reference.split(":");
  const item = await getCatalogItem(idOrSku, itemStoreOptions(opts));
  const quantity = quantityRaw === undefined ? 1 : Number(quantityRaw);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new CliError("invalid_quantity", `Invalid quantity in item reference: ${reference}`);
  }

  return {
    name: item.name,
    description: item.description,
    quantity,
    unitPrice: item.unitPrice,
  };
}
