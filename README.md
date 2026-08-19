# ETF Tracker

ETF Tracker is a React + TypeScript + Vite application for tracking an ETF portfolio with local IndexedDB storage, returns analysis, dividend tracking, and live market data.

## Features

- Portfolio summary and allocation charts
- Transaction, dividend, and reminder management
- Returns analysis with TWR and MWR calculations
- Fortnightly contribution planner with buy recommendations
- Live prices and historical data through Yahoo Finance proxy endpoints
- IndexedDB-based local persistence for portfolio data

## Tech Stack

- Frontend: React, TypeScript, Vite
- Storage: IndexedDB via Dexie
- Charts: Recharts
- Backend proxy: Vercel serverless functions or Express fallback

## Local Development

### Frontend

```bash
cd etf-tracker
npm install
npm run dev
```

### Backend proxy for local development

The app expects live price data from the backend proxy endpoints:

- `GET /api/prices`
- `GET /api/historical/:symbol`

For local development, run the backend in `etf-backend/`.

```bash
cd etf-backend
npm install
node server.js
```

By default the frontend uses `VITE_API_BASE_URL`. If that variable is not set, it falls back to the current origin.

## Production Deployment

### Recommended setup: Vercel serverless

The frontend and backend proxy can be deployed on Vercel in one project.

Required files:

- `api/price.js`
- `api/historical/[symbol].js`
- `vercel.json`

Frontend API base URL:

- Set `VITE_API_BASE_URL` to your deployed Vercel app URL, for example `https://your-app.vercel.app`
- If the frontend and API are deployed on the same Vercel project, same-origin requests also work

Build settings:

- Build command: `npm run build`
- Output directory: `dist`

Deploy commands:

```bash
cd etf-tracker
npm install
npm run build
vercel login
vercel link
vercel --prod
```

### Alternative: Render backend

If you prefer keeping the Express backend separate, deploy `etf-backend/` to Render and point `VITE_API_BASE_URL` to the Render URL.

## Environment Variables

- `VITE_API_BASE_URL`: Base URL for the API proxy in production

Examples:

- Local dev with backend running separately: `http://localhost:3001`
- Vercel production: `https://your-app.vercel.app`
- Render production: `https://your-backend.onrender.com`

## Deployment Notes

- The Yahoo Finance proxy does not require an API key.
- The serverless endpoints include CORS headers for direct browser access.
- Historical price requests may be limited by serverless execution time if you request very long date ranges.
- IndexedDB data stays in the browser and is not stored on the backend.

## Verification Checklist

- Prices load in the portfolio summary
- Historical charts render correctly
- Benchmark charts render correctly
- Transactions can be created and saved
- IndexedDB data survives refreshes

## Project Structure

- `src/` - frontend application source
- `api/` - Vercel serverless proxy functions
- `etf-backend/` - optional Express backend for local development or Render deployment
