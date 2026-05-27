function normalizeCode(value, label) {
  const code = String(value || "").trim().toLowerCase();
  if (!/^[a-z]{3}$/u.test(code)) {
    throw new Error(`${label} must be a 3-letter currency code.`);
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

  const ratesUrl = new URL(`currencies/${fromCode}.json`, baseUrl).toString();
  const currenciesUrl = new URL("currencies.json", baseUrl).toString();

  const [ratesResponse, currenciesResponse] = await Promise.all([
    fetch(ratesUrl, { headers: { accept: "application/json" } }),
    fetch(currenciesUrl, { headers: { accept: "application/json" } })
  ]);

  if (!ratesResponse.ok) {
    throw new Error(`Could not load latest rates for ${fromCode}: HTTP ${ratesResponse.status}`);
  }

  if (!currenciesResponse.ok) {
    throw new Error(`Could not load currencies list: HTTP ${currenciesResponse.status}`);
  }

  const ratesPayload = await ratesResponse.json();
  const currencyMap = await currenciesResponse.json();

  const table = ratesPayload[fromCode];
  if (!table) {
    throw new Error(`Missing base table for ${fromCode}.`);
  }

  const directRate = table[toCode];
  if (typeof directRate !== "number") {
    throw new Error(`Missing conversion from ${fromCode} to ${toCode}.`);
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
