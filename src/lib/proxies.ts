export interface ProxyTicker {
  ticker: string;
  weight: number;
}

export interface ProxyBasket {
  tickers: ProxyTicker[];
  fallbacks: Record<string, string[]>;
}

export function getPrivateProxyBasket(): ProxyBasket {
  return {
    tickers: [
      { ticker: "PSP", weight: 0.4 },
      { ticker: "BKLN", weight: 0.3 },
      { ticker: "IGF", weight: 0.15 },
      { ticker: "VNQ", weight: 0.15 },
    ],
    fallbacks: {
      PSP: ["IVW"],
      BKLN: ["JNK"],
    },
  };
}
