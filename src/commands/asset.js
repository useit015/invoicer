import { output, requireArg, requireOption } from "../command-utils.js";
import { resolveFromCwd } from "../io.js";
import { deleteAsset, listAssets, uploadAsset } from "../storage.js";
import { CliError } from "../errors.js";

export async function assetCommand(args, opts) {
  const action = args[0];

  switch (action) {
    case "upload": {
      requireOption(opts.type, "--type");
      requireOption(opts.file, "--file");
      const asset = await uploadAsset({
        type: opts.type,
        filePath: resolveFromCwd(opts.file),
        storePath: assetStorePath(opts),
      });
      return output({ ok: true, asset }, opts);
    }

    case "list": {
      const assets = await listAssets({ storePath: assetStorePath(opts) });
      return output({ ok: true, assets, count: assets.length }, opts);
    }

    case "delete": {
      requireArg(args[1], "asset id");
      const asset = await deleteAsset(args[1], { storePath: assetStorePath(opts) });
      return output({ ok: true, asset }, opts);
    }

    default:
      throw new CliError("unknown_asset_command", `Unknown asset command: ${action ?? ""}`);
  }
}

function assetStorePath(opts) {
  if (opts.assetStore) return resolveFromCwd(opts.assetStore);
  if (opts.store) return resolveFromCwd(opts.store.replace(/\.json$/u, ".assets.json"));
  return undefined;
}
