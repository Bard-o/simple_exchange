# Simple Exchange

A clean, fast multi-currency converter with live exchange rates and historical charts. Built with a Frutiger Aero aesthetic — glass morphism, red accents, and that early-2000s software warmth.

## Stack

- **Vite + React 19 + TypeScript** — SPA, no SSR needed
- **Tailwind CSS v4** — design tokens via `@theme` in a single CSS file
- **Recharts** — historical rate charts
- **Vercel Serverless Functions** — API proxy with KV caching
- **currencyapi.com** — exchange rate data source

## Architecture

```
src/
├── components/    UI components (CurrencyInput, HistoryChart, etc.)
├── hooks/         State hooks (useCurrencyStore, useExchangeRates, useHistoricalRates)
├── utils/         Conversion math, formatters, API wrappers, caching
├── types/         TypeScript interfaces
└── styles/        app.css — single source of design tokens
api/               Vercel Serverless Functions (latest, historical, backfill)
```

**State flow**: `useCurrencyStore` owns selected currencies and input values. `useExchangeRates` fetches live rates on a 10-minute interval. `useHistoricalRates` fetches per-pair chart data with sessionStorage caching. All data flows down from `App.tsx` — no prop drilling beyond one level.

**Conversion math**: All rates are expressed relative to USD (pivot). Converting EUR→COP goes through USD: `amount × (COP_rate / EUR_rate)`.

## Setup

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173`. API calls require a running Vercel dev server or deployed functions with `CURRENCY_API_KEY` env var.

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `CURRENCY_API_KEY` | Vercel serverless | API key for currencyapi.com (never exposed to client) |
| `KV_REST_API_URL` | Vercel KV (auto) | KV store URL |
| `KV_REST_API_TOKEN` | Vercel KV (auto) | KV store token |

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Deploy

Push to GitHub. Vercel auto-deploys. The `api/` directory is detected as serverless functions. Vercel KV binding is configured in the Vercel dashboard.

On first deploy, warm the historical cache by calling the backfill endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/backfill
```

## Design

The visual language is **Frutiger Aero** — the design ethos of Windows Vista/7 era software:

- Glass morphism cards with `backdrop-blur`
- Red-dominant palette with warm OKLCH tones
- Sora (display) + DM Sans (body) typography
- Charts channel late-90s/early-2000s desktop software: chunky lines, beveled tooltips

All design tokens live in `src/styles/app.css` under `@theme`. Change the palette, change one file.
