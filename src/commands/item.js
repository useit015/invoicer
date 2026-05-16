import { output, parseMetadataFields, parseNumberOption, requireArg, requireOption } from "../command-utils.js";
import { resolveFromCwd } from "../io.js";
import { createCatalogItem, deleteCatalogItem, getCatalogItem, listCatalogItems } from "../storage.js";
import { CliError } from "../errors.js";

export async function itemCommand(args, opts) {
  const action = args[0];

  switch (action) {
    case "create": {
      requireOption(opts.name, "--name");
      requireOption(opts.unitPrice, "--unit-price");
      const item = await createCatalogItem(
        {
          sku: opts.sku,
          name: opts.name,
          description: opts.description,
          unitPrice: parseNumberOption(opts.unitPrice, "--unit-price"),
          currency: opts.currency,
          metadata: parseMetadataFields(opts.field),
        },
        itemStoreOptions(opts),
      );
      return output({ ok: true, item }, opts);
    }

    case "list": {
      const items = await listCatalogItems(itemStoreOptions(opts));
      return output({ ok: true, items, count: items.length }, opts);
    }

    case "get": {
      requireArg(args[1], "item id or sku");
      const item = await getCatalogItem(args[1], itemStoreOptions(opts));
      return output({ ok: true, item }, opts);
    }

    case "delete": {
      requireArg(args[1], "item id or sku");
      const item = await deleteCatalogItem(args[1], itemStoreOptions(opts));
      return output({ ok: true, item }, opts);
    }

    default:
      throw new CliError("unknown_item_command", `Unknown item command: ${action ?? ""}`);
  }
}

function itemStoreOptions(opts) {
  return opts.itemStore ? { storePath: resolveFromCwd(opts.itemStore) } : {};
}
