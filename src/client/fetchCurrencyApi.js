const DEFAULT_PACKAGE = "@webisso/currency-api";
const DEFAULT_API_VERSION = "v1";
const DEFAULT_FALLBACK_HOST = "currency-api.pages.dev";

function normalizeDate(date) {
  if (date === "latest") {
    return date;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date: ${date}. Expected \"latest\" or YYYY-MM-DD.`);
  }

  return date;
}

function normalizeEndpoint(endpoint) {
  const cleaned = endpoint.replace(/^\/+/, "");
  if (!cleaned.endsWith(".json")) {
    throw new Error(`Endpoint must end with .json: ${endpoint}`);
  }

  return cleaned;
}

export async function fetchCurrencyEndpoint({
  date = "latest",
  apiVersion = DEFAULT_API_VERSION,
  endpoint,
  packageName = DEFAULT_PACKAGE,
  fallbackHost = DEFAULT_FALLBACK_HOST,
  fetchImpl = fetch
}) {
  const normalizedDate = normalizeDate(date);
  const normalizedEndpoint = normalizeEndpoint(endpoint);

  const primary = `https://cdn.jsdelivr.net/npm/${packageName}@${normalizedDate}/${apiVersion}/${normalizedEndpoint}`;
  const fallback = `https://${normalizedDate}.${fallbackHost}/${apiVersion}/${normalizedEndpoint}`;

  const candidates = [primary, fallback];
  let lastError;

  for (const url of candidates) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          "accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`All endpoints failed. Last error: ${lastError?.message || "unknown"}`);
}
