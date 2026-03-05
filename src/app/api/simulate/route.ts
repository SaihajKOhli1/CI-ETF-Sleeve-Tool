import { NextRequest, NextResponse } from "next/server";
import { TICKER_RE } from "@/lib/validation";
import { todayISO } from "@/lib/date";
import { fetchTiingoPrices, PricePoint } from "@/lib/tiingo";
import { computeAllMetrics } from "@/lib/metrics";
import { getPrivateProxyBasket, ProxyTicker } from "@/lib/proxies";

// Sanity test (etf):
// curl -X POST http://localhost:3000/api/simulate \
//   -H "Content-Type: application/json" \
//   -d '{"mode":"etf","holdings":[{"ticker":"AAPL","weight":0.4},{"ticker":"MSFT","weight":0.6}],"sleeveTicker":"SPY"}'
//
// Sanity test (private):
// curl -X POST http://localhost:3000/api/simulate \
//   -H "Content-Type: application/json" \
//   -d '{"mode":"private","holdings":[{"ticker":"AAPL","weight":0.4},{"ticker":"MSFT","weight":0.6}]}'

const SLEEVE_WEIGHT = 0.15;
const MIN_OVERLAP_POINTS = 60;
const ETF_FALLBACK_TICKER = "SPY";

const SLEEVE_TICKER_CANDIDATES: Record<string, string[]> = {
  "CCCX.B": ["CCCX.B", "CCCX.B:TSX", "CCCX.TO", "CCCX"],
};

interface Holding {
  ticker: string;
  weight: number;
}

interface SimulateBody {
  mode: "etf" | "private";
  holdings: Holding[];
  sleeveTicker?: string;
  start?: string;
  end?: string;
}

interface SleeveMeta {
  type: "etf" | "private_proxy";
  sleeveWeight: number;
  tickersUsed: ProxyTicker[];
}

function validateBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Request body must be JSON";

  const { mode, holdings, sleeveTicker } = body as Record<string, unknown>;

  if (!mode) return "Missing required field: mode";
  if (mode !== "etf" && mode !== "private")
    return 'mode must be "etf" or "private"';

  if (!Array.isArray(holdings) || holdings.length === 0)
    return "holdings must be a non-empty array";

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i] as Record<string, unknown>;
    if (!h.ticker || typeof h.ticker !== "string")
      return `holdings[${i}]: missing or invalid ticker`;
    if (!TICKER_RE.test(h.ticker))
      return `holdings[${i}]: invalid ticker format "${h.ticker}"`;
    if (typeof h.weight !== "number" || h.weight <= 0)
      return `holdings[${i}]: weight must be a positive number`;
  }

  const weightSum = (holdings as Holding[]).reduce(
    (sum, h) => sum + h.weight,
    0,
  );
  if (Math.abs(weightSum - 1) > 0.01)
    return `Weights must sum to 1 (got ${weightSum.toFixed(4)})`;

  if (mode === "etf") {
    if (!sleeveTicker || typeof sleeveTicker !== "string")
      return "Missing required field: sleeveTicker (required for etf mode)";
    if (!TICKER_RE.test(sleeveTicker)) return "Invalid sleeveTicker format";
  }

  return null;
}

function alignPrices(
  pricesByTicker: Map<string, PricePoint[]>,
): { dates: string[]; aligned: Map<string, number[]> } {
  const dateSets = [...pricesByTicker.values()].map(
    (pts) => new Set(pts.map((p) => p.date)),
  );

  const commonDates = [...dateSets[0]].filter((d) =>
    dateSets.every((s) => s.has(d)),
  );
  commonDates.sort();

  const aligned = new Map<string, number[]>();
  for (const [ticker, pts] of pricesByTicker) {
    const byDate = new Map(pts.map((p) => [p.date, p.adjClose]));
    aligned.set(
      ticker,
      commonDates.map((d) => byDate.get(d)!),
    );
  }

  return { dates: commonDates, aligned };
}

function dailyReturns(values: number[]): number[] {
  const r: number[] = [0];
  for (let i = 1; i < values.length; i++) {
    r.push(values[i] / values[i - 1] - 1);
  }
  return r;
}

function growthCurve(returns: number[]): number[] {
  const g: number[] = [100];
  for (let i = 1; i < returns.length; i++) {
    g.push(g[i - 1] * (1 + returns[i]));
  }
  return g;
}

/**
 * Resolve the proxy basket for private mode, attempting fallbacks on failure.
 * Returns the resolved tickers with prices and any warning strings.
 */
async function resolveProxyBasket(
  start: string,
  end: string,
): Promise<{
  proxyTickers: ProxyTicker[];
  proxyPrices: Map<string, PricePoint[]>;
  warnings: string[];
}> {
  const basket = getPrivateProxyBasket();
  const resolved: ProxyTicker[] = [];
  const proxyPrices = new Map<string, PricePoint[]>();
  const warnings: string[] = [];

  for (const entry of basket.tickers) {
    const candidates = [entry.ticker, ...(basket.fallbacks[entry.ticker] ?? [])];
    let fetched = false;

    for (const candidate of candidates) {
      try {
        const prices = await fetchTiingoPrices(candidate, start, end);
        proxyPrices.set(candidate, prices);
        resolved.push({ ticker: candidate, weight: entry.weight });
        if (candidate !== entry.ticker) {
          warnings.push(
            `${entry.ticker} unavailable, using fallback ${candidate}`,
          );
        }
        fetched = true;
        break;
      } catch {
        // try next fallback
      }
    }

    if (!fetched) {
      resolved.push({ ticker: entry.ticker, weight: entry.weight });
    }
  }

  const failed = resolved.filter((r) => !proxyPrices.has(r.ticker));
  if (failed.length === resolved.length) {
    throw new Error(
      "All proxy basket tickers failed (including fallbacks): " +
        failed.map((f) => f.ticker).join(", "),
    );
  }

  if (failed.length > 0) {
    for (const f of failed) {
      warnings.push(
        `${f.ticker} and all fallbacks failed — excluded from proxy basket`,
      );
    }
    const remaining = resolved.filter((r) => proxyPrices.has(r.ticker));
    const totalWeight = remaining.reduce((s, r) => s + r.weight, 0);
    for (const r of remaining) {
      r.weight = r.weight / totalWeight;
    }
    return { proxyTickers: remaining, proxyPrices, warnings };
  }

  return { proxyTickers: resolved, proxyPrices, warnings };
}

/**
 * Resolve an ETF sleeve ticker by trying alias candidates, then falling back to SPY.
 */
async function resolveEtfSleeveTicker(
  ticker: string,
  start: string,
  end: string,
): Promise<{
  resolvedTicker: string;
  prices: PricePoint[];
  warnings: string[];
}> {
  const candidates = SLEEVE_TICKER_CANDIDATES[ticker] ?? [ticker];
  const warnings: string[] = [];

  for (const candidate of candidates) {
    try {
      const prices = await fetchTiingoPrices(candidate, start, end);
      if (candidate !== ticker) {
        warnings.push(
          `${ticker} resolved as ${candidate} from data provider.`,
        );
      }
      return { resolvedTicker: candidate, prices, warnings };
    } catch {
      // try next candidate
    }
  }

  // All candidates failed — fall back to SPY
  warnings.push(
    `Sleeve ticker ${ticker} unavailable from provider, using ${ETF_FALLBACK_TICKER} as proxy.`,
  );
  const prices = await fetchTiingoPrices(ETF_FALLBACK_TICKER, start, end);
  return { resolvedTicker: ETF_FALLBACK_TICKER, prices, warnings };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const {
    mode,
    holdings,
    sleeveTicker,
    start: rawStart,
    end: rawEnd,
  } = body as SimulateBody;

  const start = rawStart ?? "2021-01-01";
  const end = rawEnd ?? todayISO();
  const warnings: string[] = [];

  // ── Resolve sleeve tickers based on mode ──
  let sleeveMeta: SleeveMeta;
  let sleeveTickerList: ProxyTicker[];
  const pricesByTicker = new Map<string, PricePoint[]>();

  if (mode === "private") {
    let proxyResult;
    try {
      proxyResult = await resolveProxyBasket(start, end);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    sleeveTickerList = proxyResult.proxyTickers;
    warnings.push(...proxyResult.warnings);
    for (const [t, p] of proxyResult.proxyPrices) {
      pricesByTicker.set(t, p);
    }
    sleeveMeta = {
      type: "private_proxy",
      sleeveWeight: SLEEVE_WEIGHT,
      tickersUsed: sleeveTickerList,
    };
  } else {
    let etfResult;
    try {
      etfResult = await resolveEtfSleeveTicker(sleeveTicker!, start, end);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    warnings.push(...etfResult.warnings);
    pricesByTicker.set(etfResult.resolvedTicker, etfResult.prices);
    sleeveTickerList = [{ ticker: etfResult.resolvedTicker, weight: 1 }];
    sleeveMeta = {
      type: "etf",
      sleeveWeight: SLEEVE_WEIGHT,
      tickersUsed: sleeveTickerList,
    };
  }

  // ── Fetch holdings + any sleeve tickers not yet fetched ──
  const allNeeded = [
    ...new Set([
      ...holdings.map((h) => h.ticker),
      ...sleeveTickerList.map((s) => s.ticker),
    ]),
  ];
  const toFetch = allNeeded.filter((t) => !pricesByTicker.has(t));

  try {
    const results = await Promise.all(
      toFetch.map((t) => fetchTiingoPrices(t, start, end)),
    );
    toFetch.forEach((t, i) => pricesByTicker.set(t, results[i]));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // ── Align on common dates ──
  const { dates, aligned } = alignPrices(pricesByTicker);

  if (dates.length < MIN_OVERLAP_POINTS) {
    return NextResponse.json(
      {
        error: `Not enough overlapping history (${dates.length} points, need ${MIN_OVERLAP_POINTS})`,
      },
      { status: 400 },
    );
  }

  // ── Daily returns per ticker ──
  const returnsByTicker = new Map<string, number[]>();
  for (const [ticker, values] of aligned) {
    returnsByTicker.set(ticker, dailyReturns(values));
  }

  // ── Baseline portfolio return: weighted sum of holding returns ──
  const n = dates.length;
  const baselineReturns = new Array<number>(n).fill(0);
  for (const { ticker, weight } of holdings) {
    const r = returnsByTicker.get(ticker)!;
    for (let i = 0; i < n; i++) {
      baselineReturns[i] += weight * r[i];
    }
  }

  // ── Sleeve return: weighted sum of sleeve ticker returns ──
  const sleeveTickerReturns = new Array<number>(n).fill(0);
  for (const { ticker, weight } of sleeveTickerList) {
    const r = returnsByTicker.get(ticker)!;
    for (let i = 0; i < n; i++) {
      sleeveTickerReturns[i] += weight * r[i];
    }
  }

  // ── Blended scenario ──
  const sleeveReturns = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    sleeveReturns[i] =
      (1 - SLEEVE_WEIGHT) * baselineReturns[i] +
      SLEEVE_WEIGHT * sleeveTickerReturns[i];
  }

  // ── Growth curves starting at 100 ──
  const baselineGrowth = growthCurve(baselineReturns);
  const sleeveGrowth = growthCurve(sleeveReturns);

  const baselineSeries = dates.map((d, i) => ({
    date: d,
    value: Math.round(baselineGrowth[i] * 100) / 100,
  }));
  const sleeveSeries = dates.map((d, i) => ({
    date: d,
    value: Math.round(sleeveGrowth[i] * 100) / 100,
  }));

  return NextResponse.json({
    ok: true,
    mode,
    start,
    end,
    points: n,
    dates,
    series: {
      baseline: baselineSeries,
      sleeve: sleeveSeries,
    },
    metrics: {
      baseline: computeAllMetrics(baselineSeries),
      sleeve: computeAllMetrics(sleeveSeries),
    },
    sleeveMeta,
    warnings,
  });
}
