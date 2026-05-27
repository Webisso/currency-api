import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

function withMinSuffix(filePath) {
  if (!filePath.endsWith(".json")) {
    throw new Error(`Expected .json file path but received: ${filePath}`);
  }

  return filePath.replace(/\.json$/u, ".min.json");
}

export async function writeJsonWithMinified(filePath, payload) {
  const targetDir = path.dirname(filePath);
  await mkdir(targetDir, { recursive: true });

  const pretty = `${JSON.stringify(payload, null, 2)}\n`;
  const compact = JSON.stringify(payload);

  await writeFile(filePath, pretty, "utf8");
  await writeFile(withMinSuffix(filePath), compact, "utf8");
}
