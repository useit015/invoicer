#!/usr/bin/env node
import { assetCommand } from "./commands/asset.js";
import { clientCommand } from "./commands/client.js";
import { configCommand } from "./commands/config.js";
import { dataCommand } from "./commands/data.js";
import { invoiceCommand } from "./commands/invoice.js";
import { itemCommand } from "./commands/item.js";
import { themeCommand } from "./commands/theme.js";
import { handleError, output, parseArgv } from "./command-utils.js";
import { printHelp } from "./help.js";
import { invoiceSchemaContract } from "./schema.js";
import { CliError } from "./errors.js";

const { command, args, options } = parseArgv(process.argv.slice(2));

try {
  await main(command, args, options);
} catch (error) {
  handleError(error, options);
}

async function main(commandName, args, opts) {
  if (!commandName || commandName === "help" || opts.help) {
    printHelp();
    return;
  }

  if (commandName === "schema") {
    return output({ ok: true, schema: invoiceSchemaContract() }, opts);
  }

  const commands = {
    asset: assetCommand,
    client: clientCommand,
    config: configCommand,
    data: dataCommand,
    invoice: invoiceCommand,
    item: itemCommand,
    theme: themeCommand,
  };

  if (commands[commandName]) {
    return commands[commandName](args, opts);
  }

  throw new CliError("unknown_command", `Unknown command: ${commandName}`);
}
