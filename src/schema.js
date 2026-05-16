import { getThemeDefinition, THEME_NAMES } from "./themes.js";

export const SCHEMA_VERSION = "invoicer.invoice.v1";

export const STATUS_VALUES = ["pending", "success", "error", "expired", "refunded"];
export const STORAGE_TYPES = ["local", "server"];
export const VALUE_TYPES = ["fixed", "percentage"];
export const TEMPLATE_NAMES = THEME_NAMES;
export const THEME_MODES = ["dark", "light"];

export function createDefaultInvoice(now = new Date(), options = {}) {
  const theme = getThemeDefinition(options.theme ?? "default");

  return {
    schemaVersion: SCHEMA_VERSION,
    companyDetails: {
      name: "Invoicely Ltd",
      address: "123 Main St, Anytown, USA",
      metadata: [],
    },
    clientDetails: {
      name: "John Doe",
      address: "456 Second St, Anytown, USA",
      metadata: [],
    },
    invoiceDetails: {
      theme: {
        template: theme.name,
        baseColor: options.baseColor ?? theme.baseColor,
        mode: options.mode ?? theme.mode,
      },
      currency: options.currency ?? "USD",
      prefix: "Invoice INV-",
      serialNumber: "0001",
      date: now.toISOString(),
      dueDate: null,
      paymentTerms: "",
      billingDetails: [],
    },
    items: [],
    metadata: {
      notes: "",
      terms: "",
      paymentInformation: [],
    },
  };
}

export function invoiceSchemaContract() {
  return {
    schemaVersion: SCHEMA_VERSION,
    statusValues: STATUS_VALUES,
    storageTypes: STORAGE_TYPES,
    templates: TEMPLATE_NAMES,
    themeCount: TEMPLATE_NAMES.length,
    valueTypes: VALUE_TYPES,
    requiredTopLevelFields: ["companyDetails", "clientDetails", "invoiceDetails", "items", "metadata"],
    fieldNotes: {
      "companyDetails.metadata": "Array of { label, value } pairs for tax IDs, contact info, bank info, or other company fields.",
      "clientDetails.metadata": "Array of { label, value } pairs for client email, VAT number, contact person, or other client fields.",
      "invoiceDetails.billingDetails": "Array of { label, type, value } adjustments. fixed values add directly; percentage values apply to subtotal.",
      "items": "Array of invoice line items with name, description, positive quantity, and positive unitPrice.",
      "metadata.paymentInformation": "Array of { label, value } pairs for payment method details.",
    },
  };
}

export function validateInvoice(invoice) {
  const issues = [];

  if (!isPlainObject(invoice)) {
    return {
      valid: false,
      issues: [issue("", "invalid_type", "Invoice must be a JSON object.")],
    };
  }

  validateCompanyDetails(invoice.companyDetails, issues);
  validateClientDetails(invoice.clientDetails, issues);
  validateInvoiceDetails(invoice.invoiceDetails, issues);
  validateItems(invoice.items, issues);
  validateMetadata(invoice.metadata, issues);

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function calculateInvoiceTotals(invoice) {
  const subtotal = roundMoney(invoice.items.reduce((acc, item) => acc + Number(item.quantity) * Number(item.unitPrice), 0));
  const adjustments = invoice.invoiceDetails.billingDetails.map((entry) => {
    const amount = entry.type === "fixed" ? Number(entry.value) : (subtotal * Number(entry.value)) / 100;

    return {
      label: entry.label,
      type: entry.type,
      value: Number(entry.value),
      amount: roundMoney(amount),
    };
  });

  const total = roundMoney(adjustments.reduce((acc, entry) => acc + entry.amount, subtotal));

  return {
    currency: invoice.invoiceDetails.currency,
    subtotal,
    adjustments,
    total,
  };
}

export function summarizeInvoiceRecord(record) {
  const invoice = record.invoiceFields;
  const totals = calculateInvoiceTotals(invoice);

  return {
    id: record.id,
    type: record.type,
    status: record.status,
    serialNumber: `${invoice.invoiceDetails.prefix}${invoice.invoiceDetails.serialNumber}`,
    clientName: invoice.clientDetails.name,
    itemCount: invoice.items.length,
    currency: totals.currency,
    total: totals.total,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    paidAt: record.paidAt,
  };
}

function validateCompanyDetails(value, issues) {
  if (!expectObject(value, "companyDetails", issues)) return;

  expectNonEmptyString(value.name, "companyDetails.name", issues);
  expectString(value.address, "companyDetails.address", issues);
  expectOptionalAssetString(value.logo, "companyDetails.logo", issues);
  expectOptionalAssetString(value.signature, "companyDetails.signature", issues);
  expectOptionalString(value.logoBase64, "companyDetails.logoBase64", issues);
  expectOptionalString(value.signatureBase64, "companyDetails.signatureBase64", issues);
  validateStringPairs(value.metadata, "companyDetails.metadata", issues);
}

function validateClientDetails(value, issues) {
  if (!expectObject(value, "clientDetails", issues)) return;

  expectNonEmptyString(value.name, "clientDetails.name", issues);
  expectString(value.address, "clientDetails.address", issues);
  validateStringPairs(value.metadata, "clientDetails.metadata", issues);
}

function validateInvoiceDetails(value, issues) {
  if (!expectObject(value, "invoiceDetails", issues)) return;

  if (expectObject(value.theme, "invoiceDetails.theme", issues)) {
    expectNonEmptyString(value.theme.baseColor, "invoiceDetails.theme.baseColor", issues);
    expectEnum(value.theme.mode, THEME_MODES, "invoiceDetails.theme.mode", issues);
    if (value.theme.template !== undefined) {
      expectEnum(value.theme.template, TEMPLATE_NAMES, "invoiceDetails.theme.template", issues);
    }
  }

  expectNonEmptyString(value.currency, "invoiceDetails.currency", issues);
  expectString(value.prefix, "invoiceDetails.prefix", issues);
  expectNonEmptyString(value.serialNumber, "invoiceDetails.serialNumber", issues);
  expectDateString(value.date, "invoiceDetails.date", issues);

  if (value.dueDate !== undefined && value.dueDate !== null) {
    expectDateString(value.dueDate, "invoiceDetails.dueDate", issues);
  }

  expectString(value.paymentTerms, "invoiceDetails.paymentTerms", issues);
  validateBillingDetails(value.billingDetails, issues);
}

function validateItems(value, issues) {
  if (!Array.isArray(value)) {
    issues.push(issue("items", "invalid_type", "items must be an array."));
    return;
  }

  value.forEach((item, index) => {
    const path = `items.${index}`;
    if (!expectObject(item, path, issues)) return;

    expectNonEmptyString(item.name, `${path}.name`, issues);
    expectString(item.description, `${path}.description`, issues);
    expectPositiveNumber(item.quantity, `${path}.quantity`, issues);
    expectPositiveNumber(item.unitPrice, `${path}.unitPrice`, issues);
  });
}

function validateMetadata(value, issues) {
  if (!expectObject(value, "metadata", issues)) return;

  expectString(value.notes, "metadata.notes", issues);
  expectString(value.terms, "metadata.terms", issues);
  validateStringPairs(value.paymentInformation, "metadata.paymentInformation", issues);
}

function validateBillingDetails(value, issues) {
  if (!Array.isArray(value)) {
    issues.push(issue("invoiceDetails.billingDetails", "invalid_type", "invoiceDetails.billingDetails must be an array."));
    return;
  }

  value.forEach((entry, index) => {
    const path = `invoiceDetails.billingDetails.${index}`;
    if (!expectObject(entry, path, issues)) return;

    expectNonEmptyString(entry.label, `${path}.label`, issues);
    expectEnum(entry.type, VALUE_TYPES, `${path}.type`, issues);
    expectNumber(entry.value, `${path}.value`, issues);
  });
}

function validateStringPairs(value, path, issues) {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "invalid_type", `${path} must be an array.`));
    return;
  }

  value.forEach((entry, index) => {
    const entryPath = `${path}.${index}`;
    if (!expectObject(entry, entryPath, issues)) return;

    expectNonEmptyString(entry.label, `${entryPath}.label`, issues);
    expectNonEmptyString(entry.value, `${entryPath}.value`, issues);
  });
}

function expectObject(value, path, issues) {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "invalid_type", `${path || "value"} must be an object.`));
    return false;
  }

  return true;
}

function expectString(value, path, issues) {
  if (typeof value !== "string") {
    issues.push(issue(path, "invalid_type", `${path} must be a string.`));
  }
}

function expectOptionalString(value, path, issues) {
  if (value !== undefined && typeof value !== "string") {
    issues.push(issue(path, "invalid_type", `${path} must be a string when provided.`));
  }
}

function expectNonEmptyString(value, path, issues) {
  if (typeof value !== "string") {
    issues.push(issue(path, "invalid_type", `${path} must be a string.`));
    return;
  }

  if (value.trim().length === 0) {
    issues.push(issue(path, "too_small", `${path} cannot be empty.`));
  }
}

function expectOptionalAssetString(value, path, issues) {
  if (value === undefined || value === null || value === "") return;

  if (typeof value !== "string") {
    issues.push(issue(path, "invalid_type", `${path} must be a string when provided.`));
    return;
  }

  const allowed = value.startsWith("data:image") || value.startsWith("blob:") || value.startsWith("https://") || value.startsWith("http://") || value.startsWith("file:") || !value.includes("://");

  if (!allowed) {
    issues.push(issue(path, "invalid_string", `${path} must be an image data URL, blob URL, HTTP URL, file URL, or local path.`));
  }
}

function expectEnum(value, values, path, issues) {
  if (!values.includes(value)) {
    issues.push(issue(path, "invalid_enum_value", `${path} must be one of: ${values.join(", ")}.`));
  }
}

function expectNumber(value, path, issues) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    issues.push(issue(path, "invalid_type", `${path} must be a number.`));
  }
}

function expectPositiveNumber(value, path, issues) {
  expectNumber(value, path, issues);

  if (typeof value === "number" && value <= 0) {
    issues.push(issue(path, "too_small", `${path} must be positive.`));
  }
}

function expectDateString(value, path, issues) {
  if (typeof value !== "string") {
    issues.push(issue(path, "invalid_type", `${path} must be an ISO date string.`));
    return;
  }

  if (Number.isNaN(Date.parse(value))) {
    issues.push(issue(path, "invalid_date", `${path} must be a valid date string.`));
  }
}

function issue(path, code, message) {
  return { path, code, message };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
