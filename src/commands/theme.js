import { output, requireArg, assertThemeName } from "../command-utils.js";
import { listThemeDefinitions } from "../themes.js";
import { CliError } from "../errors.js";

export async function themeCommand(args, opts) {
  const action = args[0] ?? "list";

  switch (action) {
    case "list": {
      const themes = listThemeDefinitions();
      return output({ ok: true, themes, count: themes.length }, opts);
    }

    case "show": {
      requireArg(args[1], "theme name");
      const theme = assertThemeName(args[1]);
      return output({ ok: true, theme }, opts);
    }

    default:
      throw new CliError("unknown_theme_command", `Unknown theme command: ${action}`);
  }
}
