import { NextRequest, NextResponse } from "next/server";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You convert plain-English portfolio descriptions into CSV rows.

OUTPUT FORMAT — strictly one holding per line:
TICKER,WEIGHT

Rules:
- TICKER is uppercase letters, dots, hyphens only (e.g. AAPL, CCCX.B, BRK.B)
- WEIGHT is a decimal between 0 and 1 (NOT a percentage). Sum of all weights must equal 1.
- If user writes percentages, convert: 40% → 0.4
- NO header row. NO backticks. NO markdown. NO explanation. ONLY the data rows.

Sector-to-ETF mapping — if the user describes sectors instead of specific tickers, use these liquid ETF proxies:
  tech/technology → XLK
  broad equities/stocks/market → SPY
  bonds/fixed income → AGG
  gold/commodities → GLD
  real estate/REITs → VNQ
  energy → XLE
  financials → XLF
  healthcare → XLV
  international/ex-US → VXUS

When you substitute a sector for an ETF proxy, append a WARNING LINE at the very end in this exact format:
WARNING:Mapped "sector name" to TICKER as a proxy

Example output for "60% tech, 40% bonds":
XLK,0.6
AGG,0.4
WARNING:Mapped "tech" to XLK as a proxy
WARNING:Mapped "bonds" to AGG as a proxy`;

const CSV_LINE_RE = /^([A-Za-z][A-Za-z0-9.\-]*),\s*([\d.]+)$/;

function parseAndValidate(raw: string): {
  csvRows: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  const cleaned = raw
    .replace(/```(?:csv)?\n?/g, "")
    .replace(/```/g, "")
    .trim();

  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);

  const dataLines: { ticker: string; weight: number }[] = [];

  for (const line of lines) {
    if (line.startsWith("WARNING:")) {
      warnings.push(line.slice("WARNING:".length).trim());
      continue;
    }

    if (/^ticker/i.test(line)) continue;

    const m = line.match(CSV_LINE_RE);
    if (!m) continue;

    const ticker = m[1].toUpperCase();
    const weight = parseFloat(m[2]);
    if (isNaN(weight) || weight <= 0 || weight > 1) continue;
    dataLines.push({ ticker, weight });
  }

  if (dataLines.length === 0) {
    return { csvRows: "", warnings: ["No valid holdings could be parsed from the AI response."] };
  }

  const sum = dataLines.reduce((s, d) => s + d.weight, 0);
  if (Math.abs(sum - 1) > 0.005) {
    warnings.push(
      `Weights summed to ${sum.toFixed(4)} — renormalized to 1.0.`,
    );
    for (const d of dataLines) {
      d.weight = d.weight / sum;
    }
  }

  const csvRows = dataLines
    .map((d) => d.ticker + "," + d.weight.toFixed(4).replace(/0+$/, "").replace(/\.$/, ""))
    .join("\n");

  return { csvRows, warnings };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Missing required field: text" },
      { status: 400 },
    );
  }

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      return NextResponse.json(
        { ok: false, error: `Groq API error (${groqRes.status}): ${errBody}` },
        { status: 502 },
      );
    }

    const groqData = await groqRes.json();
    const raw: string = groqData.choices?.[0]?.message?.content ?? "";

    const { csvRows, warnings } = parseAndValidate(raw);

    if (!csvRows) {
      return NextResponse.json(
        { ok: false, error: "Could not parse valid CSV from AI response.", warnings },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, csvRows, warnings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Failed to reach Groq: ${msg}` },
      { status: 502 },
    );
  }
}
