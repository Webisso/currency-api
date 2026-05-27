# TCMB Currency Collector

Production-ready daily collector for TCMB exchange rates XML feed.

## Features

- Fetches from `https://www.tcmb.gov.tr/kurlar/today.xml`
- Saves snapshots to `data/YYYY/MM/YYYY-MM-DD.xml`
- Retries failed requests up to 3 times with delay
- Validates XML integrity before persisting
- Builds versioned JSON API from XML history
- Serves via REST locally and static CDN-style from GitHub Pages
- GitHub Actions automation at 17:30 TRT daily

## URL structure (GitHub Pages)

`https://<username>.github.io/<repo>/{date}/{apiVersion}/{endpoint}`

- `date`: `latest` or `YYYY-MM-DD`
- `apiVersion`: `v1`
- `endpoint`: `currencies.json`, `currencies.min.json`, `currencies/{base}.json`, `currencies/{base}.min.json`

Examples:

- `/latest/v1/currencies.json`
- `/latest/v1/currencies/eur.json`
- `/2026-05-27/v1/currencies/usd.min.json`

## Optional jsDelivr format

After publishing package snapshots, endpoints follow:

`https://cdn.jsdelivr.net/npm/<package>@{date}/{apiVersion}/{endpoint}`

Recommended fallback pattern in clients:

1. Try jsDelivr URL
2. Fallback to Pages URL (`https://{date}.currency-api.pages.dev/...` style can be added behind Cloudflare)

## Local usage

```bash
npm install
npm run fetch
npm run build:api
npm start
```

Local API examples:

- `http://localhost:3000/latest/v1/currencies.json`
- `http://localhost:3000/latest/v1/currencies/eur.json`
- `http://localhost:3000/2026-05-27/v1/currencies/usd.min.json`

Health:

- `http://localhost:3000/health`

## Data layout

```text
data/
  YYYY/
    MM/
      YYYY-MM-DD.xml
```

## Generated API layout

```text
public/
  latest/
    v1/
      currencies.json
      currencies.min.json
      currencies/
        eur.json
        eur.min.json
  YYYY-MM-DD/
    v1/
      ...
```

## CI/CD

- `daily-fetch.yml`: fetch + validate + build + commit generated `data/` and `public/`
- `pages-deploy.yml`: publishes `public/` to GitHub Pages

## Client fallback helper

Use [src/client/fetchCurrencyApi.js](src/client/fetchCurrencyApi.js) for primary + fallback retrieval in JS apps.
