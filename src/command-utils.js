import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CliError } from "./errors.js";
import { findThemeDefinition, listThemeDefinitions } from "./themes.js";

export function parseArgv(argv) {
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

    appendOption(options, key, value);
    if (inlineValue === undefined) index += 1;
  }

  return {
    command: positional[0],
    args: positional.slice(1),
    options,
  };
}

export function output(value, opts) {
  if (opts.json || opts.pretty) {
    process.stdout.write(`${JSON.stringify(value, null, opts.pretty ? 2 : 0)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function handleError(error, opts = {}) {
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

export function requireArg(value, label) {
  if (!value) {
    throw new CliError("missing_argument", `Missing ${label}.`);
  }
}

export function requireOption(value, label) {
  if (!value) {
    throw new CliError("missing_option", `Missing ${label}.`);
  }
}

export function assertThemeName(name) {
  const theme = findThemeDefinition(name);
  if (!theme) {
    throw new CliError("unknown_theme", `Unknown theme: ${name}`, {
      availableThemes: listThemeDefinitions().map((entry) => entry.name),
    });
  }

  return theme;
}

export async function writeBinaryFile(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

export function parseMetadataFields(fields = []) {
  const values = Array.isArray(fields) ? fields : [fields];

  return values.map((entry) => {
    const separator = entry.indexOf("=");
    if (separator === -1) {
      throw new CliError("invalid_field", `Field must use label=value format: ${entry}`);
    }

    return {
      label: entry.slice(0, separator).trim(),
      value: entry.slice(separator + 1).trim(),
    };
  });
}

export function parseNumberOption(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new CliError("invalid_number", `${label} must be a number.`);
  }

  return number;
}

function appendOption(options, key, value) {
  if (options[key] === undefined) {
    options[key] = value;
    return;
  }

  if (Array.isArray(options[key])) {
    options[key].push(value);
    return;
  }

  options[key] = [options[key], value];
}

function toCamel(value) {
  return value.replace(/-([a-z])/gu, (_, char) => char.toUpperCase());
}
