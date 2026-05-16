import { output, parseMetadataFields, requireArg, requireOption } from "../command-utils.js";
import { resolveFromCwd } from "../io.js";
import { createClient, deleteClient, getClient, listClients } from "../storage.js";
import { CliError } from "../errors.js";

export async function clientCommand(args, opts) {
  const action = args[0];

  switch (action) {
    case "create": {
      requireOption(opts.name, "--name");
      const client = await createClient(
        {
          name: opts.name,
          email: opts.email,
          address: opts.address,
          phone: opts.phone,
          metadata: parseMetadataFields(opts.field),
        },
        clientStoreOptions(opts),
      );
      return output({ ok: true, client }, opts);
    }

    case "list": {
      const clients = await listClients(clientStoreOptions(opts));
      return output({ ok: true, clients, count: clients.length }, opts);
    }

    case "get": {
      requireArg(args[1], "client id");
      const client = await getClient(args[1], clientStoreOptions(opts));
      return output({ ok: true, client }, opts);
    }

    case "delete": {
      requireArg(args[1], "client id");
      const client = await deleteClient(args[1], clientStoreOptions(opts));
      return output({ ok: true, client }, opts);
    }

    default:
      throw new CliError("unknown_client_command", `Unknown client command: ${action ?? ""}`);
  }
}

function clientStoreOptions(opts) {
  return opts.clientStore ? { storePath: resolveFromCwd(opts.clientStore) } : {};
}
