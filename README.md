# Currency Rates API

[![Daily Fetch](https://github.com/Webisso/currency-api/actions/workflows/daily-fetch.yml/badge.svg)](https://github.com/Webisso/currency-api/actions/workflows/daily-fetch.yml)
[![Release](https://img.shields.io/github/v/release/Webisso/currency-api?display_name=tag)](https://github.com/Webisso/currency-api/releases)
[![Tag](https://img.shields.io/github/v/tag/Webisso/currency-api)](https://github.com/Webisso/currency-api/tags)
[![Stars](https://img.shields.io/github/stars/Webisso/currency-api?style=social)](https://github.com/Webisso/currency-api/stargazers)
[![Forks](https://img.shields.io/github/forks/Webisso/currency-api?style=social)](https://github.com/Webisso/currency-api/network/members)

Production-ready currency rates collector and historical JSON API.

Repository: https://github.com/Webisso/currency-api/

## Features

- Free and fast static JSON responses
- No rate limiting on published static endpoints
- Daily data collection and build pipeline
- Versioned API by date (`latest` and `YYYY-MM-DD`)
- Pretty and minified JSON formats
- Local REST/static server for development
- Fallback-ready client utility for CDN failover

## API URL Structure

GitHub Pages:

`https://webisso.github.io/currency-api/{date}/{apiVersion}/{endpoint}`

jsDelivr (GitHub repository distribution):

`https://cdn.jsdelivr.net/gh/Webisso/currency-api@main/docs/{date}/{apiVersion}/{endpoint}`

Format rules:

- `date`: `latest` or `YYYY-MM-DD`
- `apiVersion`: `v1`
- endpoint formats:
  - `/{endpoint}.json`
  - `/{endpoint}.min.json`

## Endpoints

`/currencies`

- Returns all supported currencies list.
- Example: `/latest/v1/currencies.json`
- Minified: `/latest/v1/currencies.min.json`

`/currencies/{base}`

- Returns full conversion table using `{base}` as base currency.
- Example: `/latest/v1/currencies/eur.json`
- Date example: `/2026-05-25/v1/currencies/eur.json`
- Minified: `/latest/v1/currencies/eur.min.json`

## Live-Style Examples

- `https://webisso.github.io/currency-api/latest/v1/currencies.json`
- `https://webisso.github.io/currency-api/latest/v1/currencies/usd.json`
- `https://webisso.github.io/currency-api/2026-05-25/v1/currencies/eur.min.json`

jsDelivr equivalents:

- `https://cdn.jsdelivr.net/gh/Webisso/currency-api@main/docs/latest/v1/currencies.json`
- `https://cdn.jsdelivr.net/gh/Webisso/currency-api@main/docs/latest/v1/currencies/usd.json`
- `https://cdn.jsdelivr.net/gh/Webisso/currency-api@main/docs/2026-05-25/v1/currencies/eur.min.json`

## Fallback Pattern

Recommended client strategy:

1. Try jsDelivr URL first.
2. If it fails, fallback to GitHub Pages URL.

You can use the built-in helper at `src/client/fetchCurrencyApi.js`.

## Local Usage

```bash
npm install
npm run fetch
npm run build:api
npm start
```

Local examples:

- `http://localhost:3000/health`
- `http://localhost:3000/latest/v1/currencies.json`
- `http://localhost:3000/latest/v1/currencies/eur.json`
- `http://localhost:3000/2026-05-25/v1/currencies/usd.min.json`

## Project Structure

```text
.github/
  workflows/
    daily-fetch.yml
    pages-deploy.yml
src/
  fetchRates.js
  buildApi.js
  saveFile.js
  server.js
  client/
    fetchCurrencyApi.js
  utils/
    date.js
    xmlValidator.js
    ratesXmlParser.js
data/
  YYYY/
    MM/
      YYYY-MM-DD.xml
docs/
  latest/
  YYYY-MM-DD/
```

## CI/CD

- `daily-fetch.yml`
  - Scheduled fetch at `17:30` Turkey time (`14:30 UTC`)
  - Retries source fetch on transient failures
  - Builds JSON API outputs
  - Commits `data/` and `docs/` only when changes exist
  - Works with GitHub Pages source set to `main /docs`

## Configuration

Environment variables:

- `CURRENCY_SOURCE_URL` (default: current XML source URL)
- `CURRENCY_SOURCE_TIMEZONE` (default: `Europe/Istanbul`)

This keeps the system provider-agnostic so source feeds can be changed later without architecture changes.
