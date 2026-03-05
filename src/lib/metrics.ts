interface SeriesPoint {
  date: string;
  value: number;
}

function dailyReturns(values: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < values.length; i++) {
    r.push(values[i] / values[i - 1] - 1);
  }
  return r;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let ss = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    ss += d * d;
  }
  return Math.sqrt(ss / (arr.length - 1));
}

export function computeCAGR(values: number[], dates: string[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  const d0 = new Date(dates[0]).getTime();
  const d1 = new Date(dates[dates.length - 1]).getTime();
  const years = (d1 - d0) / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0) return 0;
  return Math.pow(last / first, 1 / years) - 1;
}

export function computeVolatility(values: number[]): number {
  const r = dailyReturns(values);
  return stddev(r) * Math.sqrt(252);
}

export function computeMaxDrawdown(values: number[]): number {
  let peak = values[0];
  let maxDD = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > peak) peak = values[i];
    const dd = values[i] / peak - 1;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD;
}

export function computeSharpe(values: number[]): number {
  const r = dailyReturns(values);
  const sd = stddev(r);
  if (sd === 0) return 0;
  return (mean(r) / sd) * Math.sqrt(252);
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function computeAllMetrics(series: SeriesPoint[]): {
  cagr: number;
  vol: number;
  maxDrawdown: number;
  sharpe: number;
} {
  const values = series.map((p) => p.value);
  const dates = series.map((p) => p.date);
  return {
    cagr: round6(computeCAGR(values, dates)),
    vol: round6(computeVolatility(values)),
    maxDrawdown: round6(computeMaxDrawdown(values)),
    sharpe: round6(computeSharpe(values)),
  };
}
