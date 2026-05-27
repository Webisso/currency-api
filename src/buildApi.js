import path from "node:path";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { validateSourceXml } from "./utils/xmlValidator.js";
import { extractRatesFromSourceXml } from "./utils/ratesXmlParser.js";
import { writeJsonWithMinified } from "./utils/jsonWriter.js";

function roundRate(value) {
  return Number(value.toFixed(8));
}

async function listXmlFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const collected = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const nested = await listXmlFiles(fullPath);
      collected.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".xml")) {
      collected.push(fullPath);
    }
  }

  return collected;
}

function buildPairRates(tryPerUnit, baseCode) {
  const rates = {};
  const baseTry = tryPerUnit[baseCode];

  for (const [targetCode, targetTry] of Object.entries(tryPerUnit)) {
    rates[targetCode] = roundRate(baseTry / targetTry);
  }

  return rates;
}

async function buildDateVersion(outputRoot, snapshot) {
  const { date, currencies, tryPerUnit } = snapshot;
  const baseDir = path.join(outputRoot, date, "v1");

  const sortedCurrencies = Object.fromEntries(
    Object.entries(currencies).sort(([a], [b]) => a.localeCompare(b))
  );

  await writeJsonWithMinified(path.join(baseDir, "currencies.json"), sortedCurrencies);

  const allCodes = Object.keys(tryPerUnit).sort();

  for (const baseCode of allCodes) {
    const payload = {
      date,
      [baseCode]: buildPairRates(tryPerUnit, baseCode)
    };

    await writeJsonWithMinified(path.join(baseDir, "currencies", `${baseCode}.json`), payload);
  }
}

async function run() {
  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, "data");
  const outputDir = path.join(rootDir, "docs");

  await mkdir(outputDir, { recursive: true });

  const xmlFiles = (await listXmlFiles(dataDir)).sort();
  if (xmlFiles.length === 0) {
    throw new Error("No XML snapshots found under data/. Fetch data first.");
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const snapshots = [];

  for (const xmlPath of xmlFiles) {
    const xml = await readFile(xmlPath, "utf8");
    validateSourceXml(xml);
    const snapshot = extractRatesFromSourceXml(xml);
    snapshots.push(snapshot);
    await buildDateVersion(outputDir, snapshot);
    console.log(`[build] Generated JSON endpoints for ${snapshot.date}`);
  }

  snapshots.sort((a, b) => a.date.localeCompare(b.date));
  const latestDate = snapshots[snapshots.length - 1].date;

  await cp(path.join(outputDir, latestDate), path.join(outputDir, "latest"), {
    recursive: true,
    force: true
  });

  await writeFile(path.join(outputDir, ".nojekyll"), "", "utf8");

  console.log(`[build] latest -> ${latestDate}`);
}

run().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
