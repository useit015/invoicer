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
  assert.deepEqual(result.schema.statusValues, ["pending", "success", "error", "expired", "refunded"]);
});

test("invoice init emits a valid scaffold", () => {
  const result = runJson(["invoice", "init"]);

  assert.equal(result.ok, true);
  assert.equal(result.invoice.companyDetails.name, "Invoicely Ltd");
  assert.equal(result.invoice.invoiceDetails.currency, "USD");
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

test("invoice render writes HTML output", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoicer-render-"));
  const out = path.join(dir, "invoice.html");
  const result = runJson(["invoice", "render", sample, "--format", "html", "--out", out]);
  const html = readFileSync(out, "utf8");

  assert.equal(result.ok, true);
  assert.equal(result.outputPath, out);
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
