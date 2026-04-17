import { NextResponse } from "next/server"

const FX_CACHE_MS = 60 * 60 * 1000 // 1 hour
const PRICE_CACHE_MS = 15 * 60 * 1000 // 15 minutes

let fxCache: { rates: { usdToGbp: number; eurToGbp: number }; ts: number } | null = null
let priceCache: { prices: { ma: number; meli: number }; ts: number } | null = null

async function getFxRates() {
  if (fxCache && Date.now() - fxCache.ts < FX_CACHE_MS) return fxCache.rates
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/GBP", {
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    const rates = {
      usdToGbp: 1 / data.rates.USD,
      eurToGbp: 1 / data.rates.EUR,
    }
    fxCache = { rates, ts: Date.now() }
    return rates
  } catch {
    // Fallback rates if fetch fails
    return { usdToGbp: 0.79, eurToGbp: 0.86 }
  }
}

async function getStockPrices(usdToGbp: number) {
  if (priceCache && Date.now() - priceCache.ts < PRICE_CACHE_MS) return priceCache.prices
  try {
    const [maRes, meliRes] = await Promise.all([
      fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/MA?interval=1d&range=1d",
        { next: { revalidate: 900 } }
      ),
      fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/MELI?interval=1d&range=1d",
        { next: { revalidate: 900 } }
      ),
    ])
    const [maData, meliData] = await Promise.all([maRes.json(), meliRes.json()])
    const maUsd = maData?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 550
    const meliUsd = meliData?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 2000
    const prices = { ma: maUsd * usdToGbp, meli: meliUsd * usdToGbp }
    priceCache = { prices, ts: Date.now() }
    return prices
  } catch {
    return { ma: 435, meli: 1580 }
  }
}

export async function GET() {
  const fx = await getFxRates()
  const prices = await getStockPrices(fx.usdToGbp)
  return NextResponse.json({ fx, prices })
}
