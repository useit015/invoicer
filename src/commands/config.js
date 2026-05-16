import { output, requireArg } from "../command-utils.js";
import { getConfig, setConfigValue } from "../storage.js";
import { CliError } from "../errors.js";

export async function configCommand(args, opts) {
  const action = args[0] ?? "get";

  switch (action) {
    case "get": {
      const config = await getConfig(configOptions(opts));
      return output({ ok: true, config }, opts);
    }

    case "set": {
      requireArg(args[1], "config key");
      requireArg(args[2], "config value");
      const config = await setConfigValue(args[1], args[2], configOptions(opts));
      return output({ ok: true, config }, opts);
    }

    default:
      throw new CliError("unknown_config_command", `Unknown config command: ${action}`);
  }
}

function configOptions(opts) {
  return opts.config ? { configPath: opts.config } : {};
}
