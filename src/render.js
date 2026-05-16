import { calculateInvoiceTotals } from "./schema.js";
import { resolveInvoiceTheme } from "./themes.js";

export function renderInvoiceHtml(invoice, options = {}) {
  const totals = calculateInvoiceTotals(invoice);
  const serial = `${invoice.invoiceDetails.prefix}${invoice.invoiceDetails.serialNumber}`;
  const theme = resolveInvoiceTheme(invoice, options.theme);
  const pageClass = `invoice invoice-${theme.mode} template-${theme.name}`;
  const tokens = theme.tokens;
  const rows = invoice.items
    .map(
      (item) => `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong><br><span>${escapeHtml(item.description)}</span></td>
            <td>${escapeHtml(String(item.quantity))}</td>
            <td>${formatMoney(item.unitPrice)}</td>
            <td>${formatMoney(item.quantity * item.unitPrice)}</td>
          </tr>`,
    )
    .join("");
  const adjustments = totals.adjustments
    .map(
      (entry) => `
          <div class="total-row">
            <span>${escapeHtml(entry.label)} (${escapeHtml(entry.type)})</span>
            <strong>${formatMoney(entry.amount)}</strong>
          </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(serial)}</title>
    <style>
      :root {
        --accent: ${escapeCssValue(theme.baseColor)};
        --body-bg: ${escapeCssValue(tokens.bodyBackground)};
        --paper-bg: ${escapeCssValue(tokens.paperBackground)};
        --text: ${escapeCssValue(tokens.text)};
        --muted: ${escapeCssValue(tokens.muted)};
        --border: ${escapeCssValue(tokens.border)};
        --surface: ${escapeCssValue(tokens.surface)};
        --radius: ${escapeCssValue(tokens.radius)};
        color-scheme: ${theme.mode};
      }
      body { margin: 0; background: var(--body-bg); font-family: ${escapeCssValue(tokens.fontFamily)}; color: var(--text); }
      .invoice { width: min(920px, calc(100% - 32px)); margin: 24px auto; background: var(--paper-bg); padding: 36px; border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 18px 40px rgba(15, 23, 42, .08); }
      header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid var(--accent); padding-bottom: 20px; }
      h1 { margin: 0; color: var(--accent); font-size: 32px; }
      h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); }
      section { margin-top: 24px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      .box { border: 1px solid var(--border); background: var(--surface); padding: 16px; border-radius: var(--radius); }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border-bottom: 1px solid var(--border); text-align: left; padding: 10px; vertical-align: top; }
      th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
      td span, .muted, .theme-kicker { color: var(--muted); }
      .theme-kicker { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
      .totals { margin-left: auto; max-width: 360px; }
      .total-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--border); }
      .grand-total { font-size: 20px; color: var(--accent); }
      .template-vercel { box-shadow: none; }
      .template-vercel header { border: 1px solid var(--border); padding: 20px; background: #111; }
      .template-executive h1 { font-family: Georgia, 'Times New Roman', serif; letter-spacing: .03em; }
      .template-ledger table { font-variant-numeric: tabular-nums; }
      .template-studio header { border-bottom-style: dotted; }
      .template-minimal { box-shadow: none; }
      .template-aurora header { background: var(--surface); padding: 20px; border-radius: var(--radius); }
    </style>
  </head>
  <body>
    <main class="${pageClass}">
      <header>
        <div>
          <p class="theme-kicker">${escapeHtml(theme.label)}</p>
          <h1>${escapeHtml(serial)}</h1>
          <p class="muted">Currency: ${escapeHtml(invoice.invoiceDetails.currency)}</p>
        </div>
        <div>
          <p><strong>Date:</strong> ${formatDate(invoice.invoiceDetails.date)}</p>
          ${invoice.invoiceDetails.dueDate ? `<p><strong>Due:</strong> ${formatDate(invoice.invoiceDetails.dueDate)}</p>` : ""}
          ${invoice.invoiceDetails.paymentTerms ? `<p><strong>Terms:</strong> ${escapeHtml(invoice.invoiceDetails.paymentTerms)}</p>` : ""}
        </div>
      </header>
      <section class="grid">
        <div class="box">
          <h2>Billed By</h2>
          <p><strong>${escapeHtml(invoice.companyDetails.name)}</strong></p>
          <p>${escapeHtml(invoice.companyDetails.address)}</p>
          ${renderPairs(invoice.companyDetails.metadata)}
        </div>
        <div class="box">
          <h2>Billed To</h2>
          <p><strong>${escapeHtml(invoice.clientDetails.name)}</strong></p>
          <p>${escapeHtml(invoice.clientDetails.address)}</p>
          ${renderPairs(invoice.clientDetails.metadata)}
        </div>
      </section>
      <section>
        <h2>Items</h2>
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
      <section class="totals">
        <div class="total-row"><span>Subtotal</span><strong>${formatMoney(totals.subtotal)}</strong></div>
        ${adjustments}
        <div class="total-row grand-total"><span>Total</span><strong>${formatMoney(totals.total)}</strong></div>
      </section>
      ${invoice.metadata.paymentInformation.length ? `<section><h2>Payment Information</h2>${renderPairs(invoice.metadata.paymentInformation)}</section>` : ""}
      ${invoice.metadata.notes ? `<section><h2>Notes</h2><p>${escapeHtml(invoice.metadata.notes)}</p></section>` : ""}
      ${invoice.metadata.terms ? `<section><h2>Terms</h2><p>${escapeHtml(invoice.metadata.terms)}</p></section>` : ""}
    </main>
  </body>
</html>
`;
}

export function renderInvoicePdf(invoice, options = {}) {
  const lines = invoicePdfLines(invoice, options).flatMap((line) => wrapPdfLine(line, 92));
  const content = [
    "BT",
    "/F1 11 Tf",
    "14 TL",
    "50 792 Td",
    ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  const parts = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(parts.join(""), "latin1"));
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(parts.join(""), "latin1");
  parts.push(`xref\n0 ${objects.length + 1}\n`);
  parts.push("0000000000 65535 f \n");

  offsets.slice(1).forEach((offset) => {
    parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });

  parts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.from(parts.join(""), "latin1");
}

function renderPairs(pairs) {
  return pairs.map((entry) => `<p><strong>${escapeHtml(entry.label)}:</strong> ${escapeHtml(entry.value)}</p>`).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeCssValue(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("<", "")
    .replaceAll(">", "")
    .replaceAll("\n", " ");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function formatMoney(value) {
  return Number(value).toFixed(2);
}

function invoicePdfLines(invoice, options = {}) {
  const totals = calculateInvoiceTotals(invoice);
  const theme = resolveInvoiceTheme(invoice, options.theme);
  const serial = `${invoice.invoiceDetails.prefix}${invoice.invoiceDetails.serialNumber}`;
  const lines = [
    `Invoice ${serial}`,
    `Theme: ${theme.label} (${theme.name})`,
    `Currency: ${invoice.invoiceDetails.currency}`,
    `Date: ${invoice.invoiceDetails.date}`,
  ];

  if (invoice.invoiceDetails.dueDate) {
    lines.push(`Due Date: ${invoice.invoiceDetails.dueDate}`);
  }

  if (invoice.invoiceDetails.paymentTerms) {
    lines.push(`Payment Terms: ${invoice.invoiceDetails.paymentTerms}`);
  }

  lines.push(
    "",
    "Billed By",
    invoice.companyDetails.name,
    invoice.companyDetails.address,
    ...invoice.companyDetails.metadata.map((entry) => `${entry.label}: ${entry.value}`),
    "",
    "Billed To",
    invoice.clientDetails.name,
    invoice.clientDetails.address,
    ...invoice.clientDetails.metadata.map((entry) => `${entry.label}: ${entry.value}`),
    "",
    "Items",
  );

  invoice.items.forEach((item) => {
    lines.push(`${item.name} | Qty ${item.quantity} | Unit ${formatMoney(item.unitPrice)} | Total ${formatMoney(item.quantity * item.unitPrice)}`);
    if (item.description) lines.push(`  ${item.description}`);
  });

  lines.push("", `Subtotal: ${formatMoney(totals.subtotal)}`);
  totals.adjustments.forEach((entry) => {
    lines.push(`${entry.label} (${entry.type} ${entry.value}): ${formatMoney(entry.amount)}`);
  });
  lines.push(`Total: ${formatMoney(totals.total)}`);

  if (invoice.metadata.paymentInformation.length) {
    lines.push("", "Payment Information", ...invoice.metadata.paymentInformation.map((entry) => `${entry.label}: ${entry.value}`));
  }

  if (invoice.metadata.notes) {
    lines.push("", "Notes", invoice.metadata.notes);
  }

  if (invoice.metadata.terms) {
    lines.push("", "Terms", invoice.metadata.terms);
  }

  return lines;
}

function wrapPdfLine(line, width) {
  if (line.length <= width) return [line];

  const words = line.split(" ");
  const output = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      output.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) output.push(current);
  return output;
}

function escapePdfText(value) {
  return String(value)
    .replace(/[^\x20-\x7E]/gu, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}
