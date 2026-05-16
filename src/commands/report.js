import { output } from "../command-utils.js";
import { CliError } from "../errors.js";
import { resolveFromCwd } from "../io.js";
import { listInvoices } from "../storage.js";

export async function reportCommand(args, opts) {
  const action = args[0] ?? "summary";

  switch (action) {
    case "summary": {
      const invoices = await listInvoices(reportStoreOptions(opts));
      return output({ ok: true, report: summarizeInvoices(invoices) }, opts);
    }

    default:
      throw new CliError("unknown_report_command", `Unknown report command: ${action}`);
  }
}

function reportStoreOptions(opts) {
  return opts.store ? { storePath: resolveFromCwd(opts.store) } : {};
}

function summarizeInvoices(invoices) {
  const byStatus = {};
  let total = 0;

  invoices.forEach((invoice) => {
    total += invoice.total;
    byStatus[invoice.status] ??= {
      count: 0,
      total: 0,
      currency: invoice.currency,
    };
    byStatus[invoice.status].count += 1;
    byStatus[invoice.status].total = roundMoney(byStatus[invoice.status].total + invoice.total);
  });

  return {
    invoiceCount: invoices.length,
    currency: invoices[0]?.currency ?? null,
    total: roundMoney(total),
    outstanding: roundMoney(
      invoices.filter((invoice) => invoice.status !== "success").reduce((acc, invoice) => acc + invoice.total, 0),
    ),
    paid: roundMoney(
      invoices.filter((invoice) => invoice.status === "success").reduce((acc, invoice) => acc + invoice.total, 0),
    ),
    byStatus,
  };
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
