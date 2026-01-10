"use client";

import useSWR from "swr";

interface CurrentPrices {
  BTC: number;
  ETH: number;
  USDT: number;
  USDC: number;
}

async function fetchCurrentPrices(): Promise<CurrentPrices> {
  const response = await fetch("/api/prices");

  if (!response.ok) {
    throw new Error("Failed to fetch prices");
  }

  return response.json();
}

export function useCurrentPrices() {
  const { data, error, isLoading } = useSWR<CurrentPrices>(
    "current-prices",
    fetchCurrentPrices,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    prices: data || { BTC: 0, ETH: 0, USDT: 1, USDC: 1 },
    isLoading,
    error,
  };
}

interface HistoricalPriceParams {
  asset: string;
  date: string;
}

async function fetchHistoricalPrice({ asset, date }: HistoricalPriceParams): Promise<number> {
  const response = await fetch(`/api/prices/historical?asset=${asset}&date=${date}`);

  if (!response.ok) {
    throw new Error("Failed to fetch historical price");
  }

  const data = await response.json();
  return data.price_usd;
}

export function useHistoricalPrice(asset: string | null, date: string | null) {
  const key = asset && date ? `price-${asset}-${date}` : null;

  const { data, error, isLoading } = useSWR<number>(
    key,
    () => fetchHistoricalPrice({ asset: asset!, date: date! }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000, // 1 hour - historical prices don't change
    }
  );

  return {
    price: data,
    isLoading,
    error,
  };
}
