import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { CliError } from "./errors.js";
import { STATUS_VALUES, summarizeInvoiceRecord } from "./schema.js";

const STORE_VERSION = 1;
const ASSET_VERSION = 1;
const CONFIG_VERSION = 1;
const CLIENT_VERSION = 1;
const ITEM_VERSION = 1;

export function defaultInvoiceStorePath() {
  return path.resolve(process.cwd(), ".invoicer", "invoices.json");
}

export function defaultAssetStorePath() {
  return path.resolve(process.cwd(), ".invoicer", "assets.json");
}

export function defaultConfigStorePath() {
  return path.resolve(process.cwd(), ".invoicer", "config.json");
}

export function defaultClientStorePath() {
  return path.resolve(process.cwd(), ".invoicer", "clients.json");
}

export function defaultItemStorePath() {
  return path.resolve(process.cwd(), ".invoicer", "items.json");
}

export function defaultConfig() {
  return {
    version: CONFIG_VERSION,
    defaults: {
      currency: "USD",
      theme: "default",
      invoiceStore: defaultInvoiceStorePath(),
      assetStore: defaultAssetStorePath(),
      clientStore: defaultClientStorePath(),
      itemStore: defaultItemStorePath(),
    },
  };
}

export async function getConfig(options = {}) {
  const configPath = options.configPath ?? defaultConfigStorePath();
  const config = await loadJsonStore(configPath, defaultConfig());

  return {
    ...defaultConfig(),
    ...config,
    defaults: {
      ...defaultConfig().defaults,
      ...(config.defaults ?? {}),
    },
  };
}

export async function setConfigValue(key, value, options = {}) {
  const configPath = options.configPath ?? defaultConfigStorePath();
  const config = await getConfig({ configPath });

  if (!Object.hasOwn(config.defaults, key)) {
    throw new CliError("unknown_config_key", `Unknown config key: ${key}`, {
      availableKeys: Object.keys(config.defaults),
    });
  }

  config.defaults[key] = value;
  await writeJsonStore(configPath, config);

  return config;
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

export async function createClient(client, options = {}) {
  const storePath = options.storePath ?? defaultClientStorePath();
  const store = await loadClientStore(storePath);
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    name: client.name,
    email: client.email ?? "",
    address: client.address ?? "",
    phone: client.phone ?? "",
    metadata: client.metadata ?? [],
    createdAt: now,
    updatedAt: now,
  };

  store.clients.push(record);
  await saveClientStore(storePath, store);

  return record;
}

export async function listClients(options = {}) {
  const store = await loadClientStore(options.storePath ?? defaultClientStorePath());
  return store.clients;
}

export async function getClient(id, options = {}) {
  const store = await loadClientStore(options.storePath ?? defaultClientStorePath());
  const client = store.clients.find((record) => record.id === id);

  if (!client) {
    throw new CliError("client_not_found", `Client ${id} was not found.`);
  }

  return client;
}

export async function deleteClient(id, options = {}) {
  const storePath = options.storePath ?? defaultClientStorePath();
  const store = await loadClientStore(storePath);
  const index = store.clients.findIndex((record) => record.id === id);

  if (index === -1) {
    throw new CliError("client_not_found", `Client ${id} was not found.`);
  }

  const [deleted] = store.clients.splice(index, 1);
  await saveClientStore(storePath, store);

  return deleted;
}

export async function createCatalogItem(item, options = {}) {
  const storePath = options.storePath ?? defaultItemStorePath();
  const store = await loadItemStore(storePath);
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    sku: item.sku ?? "",
    name: item.name,
    description: item.description ?? "",
    unitPrice: item.unitPrice,
    currency: item.currency ?? "USD",
    metadata: item.metadata ?? [],
    createdAt: now,
    updatedAt: now,
  };

  store.items.push(record);
  await saveItemStore(storePath, store);

  return record;
}

export async function listCatalogItems(options = {}) {
  const store = await loadItemStore(options.storePath ?? defaultItemStorePath());
  return store.items;
}

export async function getCatalogItem(id, options = {}) {
  const store = await loadItemStore(options.storePath ?? defaultItemStorePath());
  const item = store.items.find((record) => record.id === id || record.sku === id);

  if (!item) {
    throw new CliError("item_not_found", `Item ${id} was not found.`);
  }

  return item;
}

export async function deleteCatalogItem(id, options = {}) {
  const storePath = options.storePath ?? defaultItemStorePath();
  const store = await loadItemStore(storePath);
  const index = store.items.findIndex((record) => record.id === id || record.sku === id);

  if (index === -1) {
    throw new CliError("item_not_found", `Item ${id} was not found.`);
  }

  const [deleted] = store.items.splice(index, 1);
  await saveItemStore(storePath, store);

  return deleted;
}

export async function exportData(options = {}) {
  const config = await getConfig({ configPath: options.configPath });

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    config,
    invoices: await loadInvoiceStore(options.invoiceStorePath ?? config.defaults.invoiceStore),
    assets: await loadAssetStore(options.assetStorePath ?? config.defaults.assetStore),
    clients: await loadClientStore(options.clientStorePath ?? config.defaults.clientStore),
    items: await loadItemStore(options.itemStorePath ?? config.defaults.itemStore),
  };
}

export async function importData(data, options = {}) {
  if (!data || typeof data !== "object") {
    throw new CliError("invalid_import", "Import data must be an object.");
  }

  const config = await getConfig({ configPath: options.configPath });
  await saveInvoiceStore(options.invoiceStorePath ?? config.defaults.invoiceStore, data.invoices ?? { invoices: [] });
  await saveAssetStore(options.assetStorePath ?? config.defaults.assetStore, data.assets ?? { assets: [] });
  await saveClientStore(options.clientStorePath ?? config.defaults.clientStore, data.clients ?? { clients: [] });
  await saveItemStore(options.itemStorePath ?? config.defaults.itemStore, data.items ?? { items: [] });

  if (data.config && options.importConfig) {
    await writeJsonStore(options.configPath ?? defaultConfigStorePath(), data.config);
  }

  return {
    invoices: (data.invoices?.invoices ?? []).length,
    assets: (data.assets?.assets ?? []).length,
    clients: (data.clients?.clients ?? []).length,
    items: (data.items?.items ?? []).length,
  };
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

async function loadClientStore(storePath) {
  const store = await loadJsonStore(storePath, { version: CLIENT_VERSION, clients: [] });

  if (!Array.isArray(store.clients)) {
    throw new CliError("invalid_store", `${storePath} does not contain a clients array.`);
  }

  return store;
}

async function saveClientStore(storePath, store) {
  await writeJsonStore(storePath, {
    version: CLIENT_VERSION,
    clients: store.clients,
  });
}

async function loadItemStore(storePath) {
  const store = await loadJsonStore(storePath, { version: ITEM_VERSION, items: [] });

  if (!Array.isArray(store.items)) {
    throw new CliError("invalid_store", `${storePath} does not contain an items array.`);
  }

  return store;
}

async function saveItemStore(storePath, store) {
  await writeJsonStore(storePath, {
    version: ITEM_VERSION,
    items: store.items,
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
