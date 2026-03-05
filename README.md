# CI Portfolio Impact Simulator

A Next.js application that lets users simulate the impact of adding a CI ETF or Private Markets sleeve to their investment portfolio. Built with real-time price data, AI-powered tools, and interactive charting.

## Features

- **Portfolio Simulation** — Upload holdings (paste or CSV) and compare a baseline portfolio against an enhanced sleeve allocation
- **ETF Sleeve** — Add a public ETF (SPY, CCCX.B, etc.) with automatic ticker resolution and fallback
- **Private Markets Sleeve** — Blend a proxy basket (PSP, BKLN, IGF, VNQ) with fallback logic
- **AI CSV Builder** — Describe a portfolio in plain English and get structured CSV output via Groq LLM
- **AI Insights** — Receive 3–5 professional investment observations generated from simulation metrics
- **Interactive Charts** — TradingView Lightweight Charts with zoom, pan, crosshair, and tooltip
- **Market Chart** — TradingView Advanced Chart widget showing the sleeve ticker in real-time
- **Portfolio Metrics** — CAGR, Volatility, Max Drawdown, and Sharpe Ratio for baseline and sleeve

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Price Data**: [Tiingo API](https://www.tiingo.com/)
- **AI**: [Groq API](https://groq.com/) (Llama 3.3 70B)
- **Charts**: [TradingView Lightweight Charts](https://github.com/nicepkg/lightweight-charts) + TradingView Advanced Chart widget
- **Styling**: Custom CSS design system (navy/white theme)

## Project Structure

```
public/
  home.html          # Landing page with How It Works + tile grid
  upload.html        # Portfolio input (paste, CSV upload, or AI generate)
  results.html       # Simulation results with charts + metrics
  widgets/
    csv-widget.js    # Floating CSV builder panel (shared across pages)

src/
  app/
    api/
      simulate/      # POST — run portfolio simulation
      prices/        # GET  — fetch single-ticker price history
      generate-csv/  # POST — AI plain-English → CSV conversion
      insights/      # POST — AI investment insight generation
    page.tsx         # Serves home.html
    upload/page.tsx  # Serves upload.html
    results/page.tsx # Serves results.html
    layout.tsx       # Root layout
  lib/
    tiingo.ts        # Tiingo API client
    metrics.ts       # CAGR, Volatility, Max Drawdown, Sharpe
    proxies.ts       # Private markets proxy basket + fallbacks
    date.ts          # Date helper
    validation.ts    # Ticker regex
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Tiingo API key](https://api.tiingo.com/)
- A [Groq API key](https://console.groq.com/)

### Setup

```bash
git clone https://github.com/SaihajKOhli1/CI-ETF-Sleeve-Tool.git
cd CI-ETF-Sleeve-Tool
npm install
```

Create a `.env.local` file:

```
TIINGO_API_KEY=your_tiingo_key_here
GROQ_API_KEY=your_groq_key_here
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/simulate` | POST | Run portfolio simulation (baseline vs sleeve) |
| `/api/prices` | GET | Fetch historical prices for a single ticker |
| `/api/generate-csv` | POST | Convert plain-English portfolio description to CSV |
| `/api/insights` | POST | Generate AI investment insights from metrics |

## How It Works

1. **Upload or generate your portfolio** — Paste holdings, upload a CSV, or use the AI CSV builder
2. **Add a CI ETF or Private Markets sleeve** — Choose a public ETF or private-markets proxy blend
3. **Analyze the impact instantly** — View growth curves, risk metrics, AI insights, and market charts

## Disclaimer

This is an **educational simulation only**. It does not constitute investment advice. No portfolio data is stored on any server. Not affiliated with CI Global Asset Management.
