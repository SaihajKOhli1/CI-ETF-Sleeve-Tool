import { NextRequest, NextResponse } from "next/server";
import { todayISO } from "@/lib/date";
import { TICKER_RE } from "@/lib/validation";
import { fetchTiingoPrices } from "@/lib/tiingo";

// Sanity test:
// curl "http://localhost:3000/api/prices?ticker=SPY&start=2024-01-01&end=2024-01-31"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const ticker = searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json(
      { error: "Missing required query param: ticker" },
      { status: 400 },
    );
  }
  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json(
      { error: "Invalid ticker format" },
      { status: 400 },
    );
  }

  const start = searchParams.get("start") ?? "2021-01-01";
  const end = searchParams.get("end") ?? todayISO();

  let prices;
  try {
    prices = await fetchTiingoPrices(ticker, start, end);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("TIINGO_API_KEY missing")) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({
    ticker: ticker.toUpperCase(),
    start,
    end,
    count: prices.length,
    prices: prices.map((p) => ({
      date: p.date,
      close: p.adjClose,
      adjClose: p.adjClose,
    })),
  });
}
