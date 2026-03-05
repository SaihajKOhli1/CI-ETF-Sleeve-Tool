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

## Simulation Math

This section documents the exact calculations the simulator performs.

### Constants

- **Sleeve weight** = 15% — the fraction of the portfolio replaced by the sleeve allocation

### Step 1: Fetch & Align Prices

Historical adjusted close prices are fetched from Tiingo for every ticker (holdings + sleeve). All tickers are aligned to **common trading dates** (dates where every ticker has a price). A minimum of 60 overlapping data points is required.

### Step 2: Daily Returns

For each ticker, daily returns are computed from the aligned adjusted close prices:

```
r[t] = price[t] / price[t-1] - 1
```

The first day's return is set to 0 (no prior price to compare).

### Step 3: Baseline Portfolio Return

The baseline is the user's original portfolio — a weighted sum of each holding's daily return:

```
baselineReturn[t] = Σ (weight_i × return_i[t])
```

For example, with 40% AAPL and 60% MSFT:

```
baselineReturn[t] = 0.4 × AAPL_return[t] + 0.6 × MSFT_return[t]
```

### Step 4: Sleeve Return

The sleeve ticker(s) produce their own weighted daily return:

- **ETF mode** (single ticker like SPY): the sleeve return is just that ETF's daily return
- **Private mode** (proxy basket): a weighted blend of the resolved proxy tickers

```
sleeveTickerReturn[t] = Σ (proxy_weight_j × return_j[t])
```

### Step 5: Blended Portfolio Return

The key formula — 15% of the portfolio is carved out and replaced with the sleeve:

```
blendedReturn[t] = 0.85 × baselineReturn[t] + 0.15 × sleeveTickerReturn[t]
```

This means every original holding is implicitly scaled down proportionally to make room for the sleeve.

### Step 6: Growth Curves

Both the baseline and blended return series are compounded into growth curves starting at $100:

```
growth[0] = 100
growth[t] = growth[t-1] × (1 + return[t])
```

These two curves are what the chart displays.

### Step 7: Portfolio Metrics

Both curves are evaluated with four standard metrics:

| Metric | Formula | Notes |
|---|---|---|
| **CAGR** | `(final / initial) ^ (1 / years) - 1` | Compound annual growth rate |
| **Volatility** | `stddev(dailyReturns) × √252` | Annualized standard deviation |
| **Max Drawdown** | `min(price[t] / peak[t] - 1)` | Largest peak-to-trough decline |
| **Sharpe Ratio** | `(mean(dailyReturns) / stddev(dailyReturns)) × √252` | Risk-free rate = 0 for MVP |

### Worked Example

Portfolio: **50% AAPL + 50% MSFT**, sleeve: **SPY at 15%**

| | Formula |
|---|---|
| Baseline day return | `0.5 × AAPL_r + 0.5 × MSFT_r` |
| With-sleeve day return | `0.85 × (0.5 × AAPL_r + 0.5 × MSFT_r) + 0.15 × SPY_r` |

The chart then shows both growth curves from $100 so you can visually compare how adding the sleeve would have changed the portfolio's historical trajectory.

### Private Markets Proxy Basket

When mode is `private`, the sleeve uses a predefined proxy basket with fallbacks:

| Proxy Ticker | Fallback | Represents |
|---|---|---|
| PSP | IVW | Private equity exposure |
| BKLN | JNK | Private credit / loans |
| IGF | — | Infrastructure |
| VNQ | — | Real estate |

If a primary ticker fails to fetch, its fallback is tried. If both fail, the ticker is excluded and remaining weights are renormalized. Warnings are included in the response.

## Disclaimer

This is an **educational simulation only**. It does not constitute investment advice. No portfolio data is stored on any server. Not affiliated with CI Global Asset Management.
