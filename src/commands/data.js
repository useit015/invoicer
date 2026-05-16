import { output, requireArg } from "../command-utils.js";
import { readJsonFile, resolveFromCwd, writeJsonFile } from "../io.js";
import { exportData, importData } from "../storage.js";
import { CliError } from "../errors.js";

export async function dataCommand(args, opts) {
  const action = args[0];

  switch (action) {
    case "export": {
      const data = await exportData(dataOptions(opts));
      if (opts.out) {
        await writeJsonFile(resolveFromCwd(opts.out), data);
      }
      return output({ ok: true, data, outputPath: opts.out ? resolveFromCwd(opts.out) : null }, opts);
    }

    case "import": {
      requireArg(args[1], "backup JSON file");
      const data = await readJsonFile(resolveFromCwd(args[1]));
      const imported = await importData(data, dataOptions(opts));
      return output({ ok: true, imported }, opts);
    }

    default:
      throw new CliError("unknown_data_command", `Unknown data command: ${action ?? ""}`);
  }
}

function dataOptions(opts) {
  const invoiceStorePath = opts.store ? resolveFromCwd(opts.store) : undefined;

  return {
    configPath: opts.config ? resolveFromCwd(opts.config) : undefined,
    invoiceStorePath,
    assetStorePath: opts.assetStore ? resolveFromCwd(opts.assetStore) : deriveStorePath(invoiceStorePath, "assets"),
    clientStorePath: opts.clientStore ? resolveFromCwd(opts.clientStore) : deriveStorePath(invoiceStorePath, "clients"),
    itemStorePath: opts.itemStore ? resolveFromCwd(opts.itemStore) : deriveStorePath(invoiceStorePath, "items"),
  };
}

function deriveStorePath(invoiceStorePath, kind) {
  if (!invoiceStorePath) return undefined;
  return invoiceStorePath.replace(/\.json$/u, `.${kind}.json`);
}
