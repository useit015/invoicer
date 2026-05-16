import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { CliError } from "./errors.js";
import { STATUS_VALUES, summarizeInvoiceRecord } from "./schema.js";

const STORE_VERSION = 1;
const ASSET_VERSION = 1;

export function defaultInvoiceStorePath() {
  return path.resolve(process.cwd(), ".invoicer", "invoices.json");
}

export function defaultAssetStorePath() {
  return path.resolve(process.cwd(), ".invoicer", "assets.json");
}

export async function createInvoice(invoice, options = {}) {
  const storePath = options.storePath ?? defaultInvoiceStorePath();
  const store = await loadInvoiceStore(storePath);
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    type: "local",
    status: "pending",
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    invoiceFields: invoice,
  };

  store.invoices.push(record);
  await saveInvoiceStore(storePath, store);

  return summarizeInvoiceRecord(record);
}

export async function listInvoices(options = {}) {
  const store = await loadInvoiceStore(options.storePath ?? defaultInvoiceStorePath());
  return store.invoices.map(summarizeInvoiceRecord);
}

export async function getInvoice(id, options = {}) {
  const store = await loadInvoiceStore(options.storePath ?? defaultInvoiceStorePath());
  const record = store.invoices.find((invoice) => invoice.id === id);

  if (!record) {
    throw new CliError("invoice_not_found", `Invoice ${id} was not found.`);
  }

  return record;
}

export async function editInvoice(id, invoice, options = {}) {
  const storePath = options.storePath ?? defaultInvoiceStorePath();
  const store = await loadInvoiceStore(storePath);
  const index = store.invoices.findIndex((record) => record.id === id);

  if (index === -1) {
    throw new CliError("invoice_not_found", `Invoice ${id} was not found.`);
  }

  const updated = {
    ...store.invoices[index],
    updatedAt: new Date().toISOString(),
    invoiceFields: invoice,
  };

  store.invoices[index] = updated;
  await saveInvoiceStore(storePath, store);

  return summarizeInvoiceRecord(updated);
}

export async function deleteInvoice(id, options = {}) {
  const storePath = options.storePath ?? defaultInvoiceStorePath();
  const store = await loadInvoiceStore(storePath);
  const index = store.invoices.findIndex((record) => record.id === id);

  if (index === -1) {
    throw new CliError("invoice_not_found", `Invoice ${id} was not found.`);
  }

  const [deleted] = store.invoices.splice(index, 1);
  await saveInvoiceStore(storePath, store);

  return summarizeInvoiceRecord(deleted);
}

export async function updateInvoiceStatus(id, status, options = {}) {
  if (!STATUS_VALUES.includes(status)) {
    throw new CliError("invalid_status", `Status must be one of: ${STATUS_VALUES.join(", ")}.`);
  }

  const storePath = options.storePath ?? defaultInvoiceStorePath();
  const store = await loadInvoiceStore(storePath);
  const record = store.invoices.find((invoice) => invoice.id === id);

  if (!record) {
    throw new CliError("invoice_not_found", `Invoice ${id} was not found.`);
  }

  if (record.status === status) {
    throw new CliError("status_unchanged", `Invoice ${id} is already ${status}.`);
  }

  record.status = status;
  record.updatedAt = new Date().toISOString();
  record.paidAt = status === "success" ? record.updatedAt : null;
  await saveInvoiceStore(storePath, store);

  return summarizeInvoiceRecord(record);
}

export async function uploadAsset({ filePath, type, storePath = defaultAssetStorePath() }) {
  if (!["logo", "signature"].includes(type)) {
    throw new CliError("invalid_asset_type", "Asset type must be logo or signature.");
  }

  let bytes;

  try {
    bytes = await readFile(filePath);
  } catch (error) {
    throw new CliError("file_read_failed", `Could not read ${filePath}`, { cause: error.message });
  }

  const maxSize = type === "logo" ? 400000 : 150000;
  if (bytes.byteLength > maxSize) {
    throw new CliError("asset_too_large", `${type} assets must be ${Math.round(maxSize / 1000)} KB or smaller.`);
  }

  const store = await loadAssetStore(storePath);
  const record = {
    id: randomUUID(),
    type,
    createdAt: new Date().toISOString(),
    fileName: path.basename(filePath),
    byteLength: bytes.byteLength,
    base64: bytes.toString("base64"),
  };

  store.assets.push(record);
  await saveAssetStore(storePath, store);

  return sanitizeAsset(record);
}

export async function listAssets(options = {}) {
  const store = await loadAssetStore(options.storePath ?? defaultAssetStorePath());
  return store.assets.map(sanitizeAsset);
}

export async function deleteAsset(id, options = {}) {
  const storePath = options.storePath ?? defaultAssetStorePath();
  const store = await loadAssetStore(storePath);
  const index = store.assets.findIndex((record) => record.id === id);

  if (index === -1) {
    throw new CliError("asset_not_found", `Asset ${id} was not found.`);
  }

  const [deleted] = store.assets.splice(index, 1);
  await saveAssetStore(storePath, store);

  return sanitizeAsset(deleted);
}

async function loadInvoiceStore(storePath) {
  const store = await loadJsonStore(storePath, { version: STORE_VERSION, invoices: [] });

  if (!Array.isArray(store.invoices)) {
    throw new CliError("invalid_store", `${storePath} does not contain an invoices array.`);
  }

  return store;
}

async function saveInvoiceStore(storePath, store) {
  await writeJsonStore(storePath, {
    version: STORE_VERSION,
    invoices: store.invoices,
  });
}

async function loadAssetStore(storePath) {
  const store = await loadJsonStore(storePath, { version: ASSET_VERSION, assets: [] });

  if (!Array.isArray(store.assets)) {
    throw new CliError("invalid_store", `${storePath} does not contain an assets array.`);
  }

  return store;
}

async function saveAssetStore(storePath, store) {
  await writeJsonStore(storePath, {
    version: ASSET_VERSION,
    assets: store.assets,
  });
}

async function loadJsonStore(storePath, fallback) {
  try {
    const text = await readFile(storePath, "utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error.code === "ENOENT") {
      return structuredClone(fallback);
    }

    if (error instanceof SyntaxError) {
      throw new CliError("invalid_json", `${storePath} is not valid JSON.`);
    }

    throw new CliError("store_read_failed", `Could not read ${storePath}`, { cause: error.message });
  }
}

async function writeJsonStore(storePath, value) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sanitizeAsset(record) {
  return {
    id: record.id,
    type: record.type,
    createdAt: record.createdAt,
    fileName: record.fileName,
    byteLength: record.byteLength,
  };
}
