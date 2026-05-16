import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CliError } from "./errors.js";

export async function readJsonFile(filePath) {
  let text;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    throw new CliError("file_read_failed", `Could not read ${filePath}`, { cause: error.message });
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError("invalid_json", `${filePath} is not valid JSON`, { cause: error.message });
  }
}

export async function writeTextFile(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

export async function writeJsonFile(filePath, value) {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function resolveFromCwd(input) {
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
}
