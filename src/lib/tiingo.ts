interface TiingoRawPrice {
  date: string;
  close: number;
  adjClose?: number;
}

export interface PricePoint {
  date: string;
  adjClose: number;
}

export async function fetchTiingoPrices(
  ticker: string,
  start: string,
  end: string,
): Promise<PricePoint[]> {
  const apiKey = process.env.TIINGO_API_KEY;
  if (!apiKey) {
    throw new Error("TIINGO_API_KEY missing");
  }

  const url =
    `https://api.tiingo.com/tiingo/daily/${encodeURIComponent(ticker)}/prices` +
    `?startDate=${start}&endDate=${end}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `Tiingo error for ${ticker} (${res.status}): ${detail.slice(0, 200)}`,
    );
  }

  const raw: TiingoRawPrice[] = await res.json();

  return raw.map((p) => ({
    date: p.date.slice(0, 10),
    adjClose: p.adjClose ?? p.close,
  }));
}
