import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTcmbDate(rawDate) {
  if (!rawDate) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }

  const match = String(rawDate).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  const slash = String(rawDate).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) {
    const [, month, day, year] = slash;
    return `${year}-${month}-${day}`;
  }

  return null;
}

function pickRate(currency) {
  const candidates = [
    currency.ForexSelling,
    currency.ForexBuying,
    currency.BanknoteSelling,
    currency.BanknoteBuying
  ];

  for (const candidate of candidates) {
    const value = toNumber(candidate);
    if (value && value > 0) {
      return value;
    }
  }

  return null;
}

export function extractRatesFromTcmbXml(xmlContent) {
  const parsed = parser.parse(xmlContent);
  const root = parsed?.Tarih_Date;

  if (!root) {
    throw new Error("Missing Tarih_Date root element.");
  }

  const normalizedDate = normalizeTcmbDate(root["@_Date"] || root["@_Tarih"]);
  if (!normalizedDate) {
    throw new Error("Could not parse TCMB date from XML attributes.");
  }

  const rows = Array.isArray(root.Currency) ? root.Currency : [root.Currency];

  const tryPerUnit = { try: 1 };
  const currencies = { try: "Turkish Lira" };

  for (const row of rows) {
    const code = String(row?.["@_CurrencyCode"] || "").trim().toLowerCase();
    if (!code) {
      continue;
    }

    const rate = pickRate(row);
    if (!rate) {
      continue;
    }

    const unit = toNumber(row.Unit) || 1;
    const perUnitTry = rate / unit;

    if (!Number.isFinite(perUnitTry) || perUnitTry <= 0) {
      continue;
    }

    tryPerUnit[code] = perUnitTry;
    currencies[code] = String(row.CurrencyName || code).trim();
  }

  return {
    date: normalizedDate,
    tryPerUnit,
    currencies
  };
}
