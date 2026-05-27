import path from "node:path";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { validateSourceXml } from "./utils/xmlValidator.js";
import { extractRatesFromSourceXml } from "./utils/ratesXmlParser.js";
import { writeJsonWithMinified } from "./utils/jsonWriter.js";

const CONVERT_JS = `function normalizeCode(value, label) {
  const code = String(value || "").trim().toLowerCase();
  if (!/^[a-z]{3}$/u.test(code)) {
    throw new Error(\`\${label} must be a 3-letter currency code.\`);
  }
  return code;
}

function normalizeUnit(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("unit must be a positive number.");
  }
  return parsed;
}

function round(value) {
  return Number(value.toFixed(8));
}

export async function convertLatest({ from, to, unit = 1, baseUrl = new URL("./", import.meta.url).href } = {}) {
  const fromCode = normalizeCode(from, "from");
  const toCode = normalizeCode(to, "to");
  const amount = normalizeUnit(unit);

  const ratesUrl = new URL(\`currencies/\${fromCode}.json\`, baseUrl).toString();
  const currenciesUrl = new URL("currencies.json", baseUrl).toString();

  const [ratesResponse, currenciesResponse] = await Promise.all([
    fetch(ratesUrl, { headers: { accept: "application/json" } }),
    fetch(currenciesUrl, { headers: { accept: "application/json" } })
  ]);

  if (!ratesResponse.ok) {
    throw new Error(\`Could not load latest rates for \${fromCode}: HTTP \${ratesResponse.status}\`);
  }

  if (!currenciesResponse.ok) {
    throw new Error(\`Could not load currencies list: HTTP \${currenciesResponse.status}\`);
  }

  const ratesPayload = await ratesResponse.json();
  const currencyMap = await currenciesResponse.json();

  const table = ratesPayload[fromCode];
  if (!table) {
    throw new Error(\`Missing base table for \${fromCode}.\`);
  }

  const directRate = table[toCode];
  if (typeof directRate !== "number") {
    throw new Error(\`Missing conversion from \${fromCode} to \${toCode}.\`);
  }

  const fromTry = table.try;
  const toTry = round(fromTry / directRate);
  const converted = round(amount * directRate);

  return {
    date: ratesPayload.date,
    unit: amount,
    from: {
      code: fromCode,
      name: currencyMap[fromCode] || fromCode,
      try_rate: fromTry
    },
    to: {
      code: toCode,
      name: currencyMap[toCode] || toCode,
      try_rate: toTry
    },
    conversion: {
      rate: round(directRate),
      amount: converted
    }
  };
}

export async function runLatestConversionFromQuery({ search = globalThis.location?.search || "", target = globalThis.document?.body } = {}) {
  const params = new URLSearchParams(search);
  const payload = await convertLatest({
    from: params.get("from"),
    to: params.get("to"),
    unit: params.get("unit") || 1
  });

  if (target) {
    target.textContent = JSON.stringify(payload, null, 2);
  }

  return payload;
}
`;

const CONVERT_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Currency Conversion</title>
    <style>
      body { margin: 0; padding: 24px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0b1020; color: #e6edf6; }
      pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>
    <pre id="result">Loading...</pre>
    <script type="module">
      import { runLatestConversionFromQuery } from "../convert.js";

      const resultNode = document.getElementById("result");
      runLatestConversionFromQuery({ target: resultNode }).catch((error) => {
        resultNode.textContent = JSON.stringify({ error: error.message }, null, 2);
      });
    </script>
  </body>
</html>
`;

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

async function writeLatestConversionAssets(outputRoot) {
  const latestDir = path.join(outputRoot, "latest", "v1");
  const convertPageDir = path.join(latestDir, "convert");

  await mkdir(convertPageDir, { recursive: true });
  await writeFile(path.join(latestDir, "convert.js"), CONVERT_JS, "utf8");
  await writeFile(path.join(convertPageDir, "index.html"), CONVERT_HTML, "utf8");
}

async function writeLandingSite(rootDir, outputRoot) {
  const sourcePath = path.join(rootDir, "site", "index.html");
  const targetPath = path.join(outputRoot, "index.html");
  const html = await readFile(sourcePath, "utf8");
  await writeFile(targetPath, html, "utf8");
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

  await writeLatestConversionAssets(outputDir);
  await writeLandingSite(rootDir, outputDir);

  await writeFile(path.join(outputDir, ".nojekyll"), "", "utf8");

  console.log(`[build] latest -> ${latestDate}`);
}

run().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
