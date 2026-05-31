import path from "node:path";
import { validateSourceXml } from "./utils/xmlValidator.js";
import { extractRatesFromSourceXml } from "./utils/ratesXmlParser.js";
import { saveXmlSnapshot } from "./saveFile.js";

const SOURCE_XML_URL = process.env.CURRENCY_SOURCE_URL || "https://www.tcmb.gov.tr/kurlar/today.xml";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSourceXmlWithRetry(url, maxRetries, delayMs) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      console.log(`[fetch] Attempt ${attempt}/${maxRetries}: ${url}`);

      const response = await fetch(url, {
        headers: {
          "user-agent": "currency-rates-collector/1.0"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const xmlContent = await response.text();
      validateSourceXml(xmlContent);

      return xmlContent;
    } catch (error) {
      lastError = error;
      console.error(`[fetch] Failed attempt ${attempt}: ${error.message}`);

      if (attempt < maxRetries) {
        console.log(`[fetch] Retrying in ${delayMs}ms...`);
        await wait(delayMs);
      }
    }
  }

  throw new Error(`Unable to fetch source XML after ${maxRetries} attempts: ${lastError.message}`);
}

async function run() {
  const xmlContent = await fetchSourceXmlWithRetry(SOURCE_XML_URL, MAX_RETRIES, RETRY_DELAY_MS);
  const snapshot = extractRatesFromSourceXml(xmlContent);

  const dataDir = path.resolve(process.cwd(), "data");
  const filePath = await saveXmlSnapshot({
    baseDir: dataDir,
    isoDate: snapshot.date,
    xmlContent
  });

  console.log(`[save] Snapshot stored at: ${filePath}`);
}

run().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
