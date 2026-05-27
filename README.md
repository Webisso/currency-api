# TCMB Currency Collector

Production-ready daily collector for TCMB exchange rates XML feed.

## Features

- Fetches from `https://www.tcmb.gov.tr/kurlar/today.xml`
- Saves snapshots to `data/YYYY/MM/YYYY-MM-DD.xml`
- Retries failed requests up to 3 times with delay
- Validates XML integrity before persisting
- GitHub Actions automation at 17:30 TRT daily

## Local usage

```bash
npm install
npm run fetch
```

## Data layout

```text
data/
  YYYY/
    MM/
      YYYY-MM-DD.xml
```
