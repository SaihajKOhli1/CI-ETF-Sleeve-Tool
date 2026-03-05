import { NextRequest, NextResponse } from "next/server";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a senior portfolio analyst at an institutional asset manager.
Given baseline and sleeve portfolio metrics, produce exactly 3 to 5 concise investment insights.
Rules:
- Each insight is ONE sentence, professional tone, no fluff.
- Reference specific metrics when relevant (e.g. CAGR, volatility, Sharpe, drawdown).
- Compare baseline vs sleeve where meaningful.
- Do NOT give investment advice or recommendations — state observations only.
- Return a JSON array of strings, nothing else. Example: ["Insight one.", "Insight two.", "Insight three."]`;

interface Metrics {
  cagr: number;
  vol: number;
  maxDrawdown: number;
  sharpe: number;
}

interface InsightsBody {
  baselineMetrics?: Metrics;
  sleeveMetrics?: Metrics;
  sleeveMeta?: {
    type: string;
    sleeveWeight: number;
    tickersUsed: { ticker: string; weight: number }[];
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: InsightsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.baselineMetrics || !body.sleeveMetrics) {
    return NextResponse.json(
      { error: "Missing baselineMetrics or sleeveMetrics" },
      { status: 400 },
    );
  }

  const userContent = JSON.stringify(
    {
      baseline: body.baselineMetrics,
      sleeve: body.sleeveMetrics,
      sleeveMeta: body.sleeveMeta ?? null,
    },
    null,
    2,
  );

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
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 512,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      return NextResponse.json(
        { error: `Groq API error (${groqRes.status}): ${errBody}` },
        { status: 502 },
      );
    }

    const groqData = await groqRes.json();
    const raw: string = groqData.choices?.[0]?.message?.content ?? "[]";

    const cleaned = raw
      .replace(/```(?:json)?\n?/g, "")
      .replace(/```/g, "")
      .trim();

    let insights: string[];
    try {
      insights = JSON.parse(cleaned);
      if (!Array.isArray(insights)) throw new Error("not an array");
      insights = insights.filter(
        (s) => typeof s === "string" && s.trim().length > 0,
      );
    } catch {
      insights = cleaned
        .split("\n")
        .map((l) => l.replace(/^[\d.\-*]+\s*/, "").trim())
        .filter((l) => l.length > 0);
    }

    return NextResponse.json({ insights });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to reach Groq: ${msg}` },
      { status: 502 },
    );
  }
}
