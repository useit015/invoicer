import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "src", "cli.js");
const sample = path.join(root, "examples", "invoice.sample.json");

function run(args, options = {}) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
}

function runJson(args, options = {}) {
  return JSON.parse(run([...args, "--json"], options));
}

test("schema exposes the agent contract", () => {
  const result = runJson(["schema"]);

  assert.equal(result.ok, true);
  assert.equal(result.schema.schemaVersion, "invoicer.invoice.v1");
  assert.ok(result.schema.themeCount >= 7);
  assert.ok(result.schema.templates.includes("executive"));
  assert.deepEqual(result.schema.statusValues, ["pending", "success", "error", "expired", "refunded"]);
});

test("theme list exposes professional render themes", () => {
  const result = runJson(["theme", "list"]);

  assert.equal(result.ok, true);
  assert.ok(result.count >= 7);
  assert.ok(result.themes.some((theme) => theme.name === "studio" && theme.label === "Studio Coral"));
});

test("invoice init emits a valid themed scaffold", () => {
  const result = runJson(["invoice", "init", "--theme", "ledger", "--currency", "EUR"]);

  assert.equal(result.ok, true);
  assert.equal(result.invoice.companyDetails.name, "Invoicely Ltd");
  assert.equal(result.invoice.invoiceDetails.currency, "EUR");
  assert.equal(result.invoice.invoiceDetails.theme.template, "ledger");
  assert.equal(result.invoice.invoiceDetails.theme.baseColor, "#047857");
});

test("invoice validate and total work for the sample fixture", () => {
  const validation = runJson(["invoice", "validate", sample]);
  const total = runJson(["invoice", "total", sample]);

  assert.equal(validation.valid, true);
  assert.equal(total.totals.subtotal, 375);
  assert.equal(total.totals.total, 387.5);
});

test("invalid invoice exits non-zero with structured issues", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-invalid-"));
  const invalidPath = path.join(dir, "invalid.json");
  writeFileSync(invalidPath, JSON.stringify({ companyDetails: {} }));

  const result = spawnSync(process.execPath, [cli, "invoice", "validate", invalidPath, "--json"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "invoice_invalid");
  assert.ok(payload.error.issues.some((issue) => issue.path === "companyDetails.name"));
});

test("local invoice lifecycle supports create list get status edit and delete", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-store-"));
  const store = path.join(dir, "invoices.json");
  const created = runJson(["invoice", "create", sample, "--store", store]);

  assert.equal(created.invoice.status, "pending");

  const listed = runJson(["invoice", "list", "--store", store]);
  assert.equal(listed.count, 1);

  const id = created.invoice.id;
  const got = runJson(["invoice", "get", id, "--store", store]);
  assert.equal(got.invoice.id, id);

  const updated = runJson(["invoice", "status", id, "success", "--store", store]);
  assert.equal(updated.invoice.status, "success");
  assert.ok(updated.invoice.paidAt);

  const edited = runJson(["invoice", "edit", id, sample, "--store", store]);
  assert.equal(edited.invoice.id, id);

  const deleted = runJson(["invoice", "delete", id, "--store", store]);
  assert.equal(deleted.invoice.id, id);

  const empty = runJson(["invoice", "list", "--store", store]);
  assert.equal(empty.count, 0);
});

test("config supports get and set defaults", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-config-"));
  const config = path.join(dir, "config.json");

  const before = runJson(["config", "get", "--config", config]);
  assert.equal(before.config.defaults.currency, "USD");

  const updated = runJson(["config", "set", "currency", "EUR", "--config", config]);
  assert.equal(updated.config.defaults.currency, "EUR");

  const invoice = runJson(["invoice", "init", "--config", config]);
  assert.equal(invoice.invoice.invoiceDetails.currency, "EUR");
});

test("client workflow supports create list get and delete", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-clients-"));
  const clientStore = path.join(dir, "clients.json");
  const created = runJson([
    "client",
    "create",
    "--name",
    "Acme Co",
    "--email",
    "billing@acme.example",
    "--field",
    "VAT=EU123",
    "--client-store",
    clientStore,
  ]);

  assert.equal(created.client.name, "Acme Co");
  assert.deepEqual(created.client.metadata, [{ label: "VAT", value: "EU123" }]);

  const listed = runJson(["client", "list", "--client-store", clientStore]);
  assert.equal(listed.count, 1);

  const fetched = runJson(["client", "get", created.client.id, "--client-store", clientStore]);
  assert.equal(fetched.client.email, "billing@acme.example");

  const deleted = runJson(["client", "delete", created.client.id, "--client-store", clientStore]);
  assert.equal(deleted.client.id, created.client.id);
});

test("item catalog supports create list get and delete", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-items-"));
  const itemStore = path.join(dir, "items.json");
  const created = runJson([
    "item",
    "create",
    "--sku",
    "CONSULT",
    "--name",
    "Consulting",
    "--description",
    "Hourly consulting",
    "--unit-price",
    "125",
    "--item-store",
    itemStore,
  ]);

  assert.equal(created.item.sku, "CONSULT");
  assert.equal(created.item.unitPrice, 125);

  const listed = runJson(["item", "list", "--item-store", itemStore]);
  assert.equal(listed.count, 1);

  const fetched = runJson(["item", "get", "CONSULT", "--item-store", itemStore]);
  assert.equal(fetched.item.name, "Consulting");

  const deleted = runJson(["item", "delete", "CONSULT", "--item-store", itemStore]);
  assert.equal(deleted.item.id, created.item.id);
});

test("data export and import round-trip all local stores", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-data-"));
  const store = path.join(dir, "invoices.json");
  const clientStore = path.join(dir, "clients.json");
  const itemStore = path.join(dir, "items.json");
  const assetStore = path.join(dir, "assets.json");
  const out = path.join(dir, "backup.json");
  const importStore = path.join(dir, "imported-invoices.json");

  runJson(["invoice", "create", sample, "--store", store]);
  runJson(["client", "create", "--name", "Acme Co", "--client-store", clientStore]);
  runJson(["item", "create", "--name", "Consulting", "--unit-price", "125", "--item-store", itemStore]);

  const exported = runJson([
    "data",
    "export",
    "--store",
    store,
    "--client-store",
    clientStore,
    "--item-store",
    itemStore,
    "--asset-store",
    assetStore,
    "--out",
    out,
  ]);

  assert.equal(exported.outputPath, out);
  assert.equal(exported.data.invoices.invoices.length, 1);
  assert.equal(exported.data.clients.clients.length, 1);
  assert.equal(exported.data.items.items.length, 1);

  const imported = runJson(["data", "import", out, "--store", importStore]);
  assert.equal(imported.imported.invoices, 1);
  assert.equal(imported.imported.clients, 1);
  assert.equal(imported.imported.items, 1);
});

test("invoice compose uses saved clients and catalog items", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-compose-"));
  const clientStore = path.join(dir, "clients.json");
  const itemStore = path.join(dir, "items.json");
  const out = path.join(dir, "composed.json");
  const client = runJson([
    "client",
    "create",
    "--name",
    "Acme Co",
    "--email",
    "billing@acme.example",
    "--address",
    "44 Client Ave",
    "--client-store",
    clientStore,
  ]);
  runJson([
    "item",
    "create",
    "--sku",
    "CONSULT",
    "--name",
    "Consulting",
    "--description",
    "Hourly work",
    "--unit-price",
    "125",
    "--item-store",
    itemStore,
  ]);

  const composed = runJson([
    "invoice",
    "compose",
    "--client",
    client.client.id,
    "--item",
    "CONSULT:2",
    "--client-store",
    clientStore,
    "--item-store",
    itemStore,
    "--company-name",
    "Northstar Studio",
    "--out",
    out,
  ]);
  const validation = runJson(["invoice", "validate", out]);

  assert.equal(composed.invoice.clientDetails.name, "Acme Co");
  assert.equal(composed.invoice.companyDetails.name, "Northstar Studio");
  assert.equal(composed.invoice.items[0].quantity, 2);
  assert.equal(composed.invoice.items[0].unitPrice, 125);
  assert.equal(validation.valid, true);
});

test("report summary aggregates stored invoices", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-report-"));
  const store = path.join(dir, "invoices.json");
  const created = runJson(["invoice", "create", sample, "--store", store]);
  runJson(["invoice", "status", created.invoice.id, "success", "--store", store]);
  const report = runJson(["report", "summary", "--store", store]);

  assert.equal(report.report.invoiceCount, 1);
  assert.equal(report.report.total, 387.5);
  assert.equal(report.report.paid, 387.5);
  assert.equal(report.report.outstanding, 0);
  assert.equal(report.report.byStatus.success.count, 1);
});

test("invoice render writes HTML output", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-render-"));
  const out = path.join(dir, "invoice.html");
  const result = runJson(["invoice", "render", sample, "--format", "html", "--theme", "studio", "--out", out]);
  const html = readFileSync(out, "utf8");

  assert.equal(result.ok, true);
  assert.equal(result.outputPath, out);
  assert.match(html, /template-studio/);
  assert.match(html, /Studio Coral/);
  assert.match(html, /INV-2026-0001/);
  assert.match(html, /Northstar Studio LLC/);
});

test("invoice render writes dependency-free PDF output", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-render-pdf-"));
  const out = path.join(dir, "invoice.pdf");
  const result = runJson(["invoice", "render", sample, "--format", "pdf", "--out", out]);
  const pdf = readFileSync(out);

  assert.equal(result.ok, true);
  assert.equal(result.format, "pdf");
  assert.equal(result.outputPath, out);
  assert.ok(result.byteLength > 100);
  assert.equal(pdf.subarray(0, 8).toString("latin1"), "%PDF-1.4");
});

test("asset registry supports upload list and delete", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-assets-"));
  const assetStore = path.join(dir, "assets.json");
  const image = path.join(dir, "logo.txt");
  writeFileSync(image, "fake-image");

  const uploaded = runJson(["asset", "upload", "--type", "logo", "--file", image, "--asset-store", assetStore]);
  assert.equal(uploaded.asset.type, "logo");
  assert.equal(uploaded.asset.fileName, "logo.txt");

  const listed = runJson(["asset", "list", "--asset-store", assetStore]);
  assert.equal(listed.count, 1);

  const deleted = runJson(["asset", "delete", uploaded.asset.id, "--asset-store", assetStore]);
  assert.equal(deleted.asset.id, uploaded.asset.id);
});
