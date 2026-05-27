import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export async function saveXmlSnapshot({ baseDir, dateParts, xmlContent }) {
  const targetDir = path.join(baseDir, dateParts.year, dateParts.month);
  const filePath = path.join(targetDir, `${dateParts.iso}.xml`);

  await mkdir(targetDir, { recursive: true });
  await writeFile(filePath, xmlContent, "utf8");

  return filePath;
}
