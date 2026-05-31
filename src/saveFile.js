import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

function getDatePartsFromIsoDate(isoDate) {
  const match = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error(`Invalid ISO date for snapshot path: ${isoDate}`);
  }

  const [, year, month] = match;

  return {
    year,
    month,
    iso: isoDate
  };
}

export async function saveXmlSnapshot({ baseDir, isoDate, xmlContent }) {
  const dateParts = getDatePartsFromIsoDate(isoDate);
  const targetDir = path.join(baseDir, dateParts.year, dateParts.month);
  const filePath = path.join(targetDir, `${dateParts.iso}.xml`);

  await mkdir(targetDir, { recursive: true });
  await writeFile(filePath, xmlContent, "utf8");

  return filePath;
}
