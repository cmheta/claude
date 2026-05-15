"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ContextualChat } from "@/components/contextual-chat"
import { formatGBP, formatPct } from "@/lib/utils"
import type { NetWorthBreakdown, Snapshot } from "@/types/database"

// ONS Wealth & Assets Survey 2020 + FCA Financial Lives 2022
// Demographic: professionals, London, 30–38, £80–120k income
const PEER = {
  median_net_worth: 197_400,
  top_25_pct_net_worth: 380_000,
  top_10_pct_net_worth: 650_000,
  median_savings_rate_pct: 18,
  good_savings_rate_pct: 25,
  median_stocks_pct: 28,
  good_stocks_pct: 45,
  median_pension_pct: 35,
}

// Notable public 13F / fund movements (updated quarterly — last: Q1 2025)
const FUND_MOVES = [
  {
    fund: "Berkshire Hathaway",
    action: "Trimmed financials, increased cash position to ~$334bn",
    direction: "cautious",
    relevance: "Buffett being cautious at market highs — validates having bonds/diversification",
  },
  {
    fund: "Vanguard (index)",
    action: "S&P 500 index continues to be largest global ETF — VUSA follows it exactly",
    direction: "positive",
    relevance: "Your VUSA ISA and Vanguard positions are aligned with institutional preference",
  },
  {
    fund: "JP Morgan / BlackRock",
    action: "Increased emerging market LatAm allocation in H2 2024",
    direction: "positive",
    relevance: "Supports your MELI thesis — institutional money moving into LatAm fintech/ecommerce",
  },
  {
    fund: "Cathie Wood (ARK)",
    action: "Added fintech/payments exposure in 2025",
    direction: "positive",
    relevance: "Payments/fintech theme (Mastercard) remains in favour with growth funds",
  },
]

function peerStatus(her: number, median: number, good: number, unit: string, higherIsBetter = true) {
  const aboveMedian = higherIsBetter ? her >= median : her <= median
  const aboveGood = higherIsBetter ? her >= good : her <= good
  if (aboveGood) return { label: "Top quartile", variant: "success" as const }
  if (aboveMedian) return { label: "Above median", variant: "default" as const }
  return { label: "Below median", variant: "warning" as const }
}

export function TabBenchmark({
  nw,
  snapshot,
}: {
  nw: NetWorthBreakdown
  snapshot: Snapshot
}) {
  const savingsRate = snapshot.salary_gbp > 0
    ? Math.round((snapshot.left_to_save_gbp / snapshot.salary_gbp) * 100)
    : 0
  const stocksPct = Math.round((nw.investments_gbp / nw.total_gbp) * 100)

  const nwStatus = peerStatus(nw.total_gbp, PEER.median_net_worth, PEER.top_25_pct_net_worth, "£")
  const srStatus = peerStatus(savingsRate, PEER.median_savings_rate_pct, PEER.good_savings_rate_pct, "%")
  const stocksStatus = peerStatus(stocksPct, PEER.median_stocks_pct, PEER.good_stocks_pct, "%")

  const chatContext = {
    netWorth: Math.round(nw.total_gbp),
    savingsRate: `${savingsRate}%`,
    stocksAllocation: `${stocksPct}%`,
    peer: {
      medianNetWorth: PEER.median_net_worth,
      medianSavingsRate: `${PEER.median_savings_rate_pct}%`,
      medianStocks: `${PEER.median_stocks_pct}%`,
    },
    percentileEstimate: nw.total_gbp > PEER.top_10_pct_net_worth ? "top 10%" :
      nw.total_gbp > PEER.top_25_pct_net_worth ? "top 25%" : "above median",
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">¿Voy bien?</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Comparativa vs professionals en Londres, 30–38 años, £80–120k salario. Fuente: ONS/FCA 2022.
        </p>
      </div>

      {/* Peer comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs text-slate-500">Patrimonio neto</p>
            <p className="text-2xl font-bold">{formatGBP(nw.total_gbp)}</p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Mediana peers: {formatGBP(PEER.median_net_worth)}</p>
              <p>Top 25%: {formatGBP(PEER.top_25_pct_net_worth)}</p>
              <p>Top 10%: {formatGBP(PEER.top_10_pct_net_worth)}</p>
            </div>
            <Badge variant={nwStatus.variant}>{nwStatus.label}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs text-slate-500">Tasa de ahorro mensual</p>
            <p className="text-2xl font-bold">{savingsRate}%</p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Mediana peers: {PEER.median_savings_rate_pct}%</p>
              <p>Objetivo óptimo: {PEER.good_savings_rate_pct}%+</p>
              <p>Tu ahorro: {formatGBP(snapshot.left_to_save_gbp)}/mo</p>
            </div>
            <Badge variant={srStatus.variant}>{srStatus.label}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs text-slate-500">% en acciones/inversiones</p>
            <p className="text-2xl font-bold">{stocksPct}%</p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Mediana peers: {PEER.median_stocks_pct}%</p>
              <p>Objetivo óptimo: {PEER.good_stocks_pct}%+</p>
              <p>Tu cartera: {formatGBP(nw.investments_gbp)}</p>
            </div>
            <Badge variant={stocksStatus.variant}>{stocksStatus.label}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Visual ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700">Posición estimada entre peers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Patrimonio neto", her: nw.total_gbp, median: PEER.median_net_worth, top: PEER.top_10_pct_net_worth, format: (v: number) => formatGBP(v) },
            { label: "Tasa de ahorro", her: savingsRate, median: PEER.median_savings_rate_pct, top: PEER.good_savings_rate_pct, format: (v: number) => `${v}%` },
            { label: "Exposición acciones", her: stocksPct, median: PEER.median_stocks_pct, top: PEER.good_stocks_pct, format: (v: number) => `${v}%` },
          ].map(({ label, her, median, top, format }) => {
            const pct = Math.min((her / top) * 100, 100)
            const medianPct = (median / top) * 100
            return (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{label}</span>
                  <span className="font-medium text-slate-700">{format(her)}</span>
                </div>
                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-slate-400"
                    style={{ left: `${medianPct}%` }}
                    title={`Mediana: ${format(median)}`}
                  />
                </div>
                <p className="text-xs text-slate-400">Mediana: {format(median)} · Top: {format(top)}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Grandes inversores */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Grandes inversores — últimos movimientos</h3>
        <p className="text-xs text-slate-400 mb-3">13F filings públicos Q1 2025 · Actualizar trimestralmente</p>
        <div className="space-y-3">
          {FUND_MOVES.map((m) => (
            <Card key={m.fund}>
              <CardContent className="py-3 flex items-start gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                  m.direction === "positive" ? "bg-emerald-500" : m.direction === "cautious" ? "bg-amber-400" : "bg-red-500"
                }`} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{m.fund}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.action}</p>
                  <p className="text-xs text-emerald-700 mt-1 bg-emerald-50 rounded px-2 py-0.5 inline-block">{m.relevance}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ContextualChat
        tab="benchmark"
        context={chatContext}
        placeholder="¿Tengo demasiado poco en acciones vs mis peers?"
      />
    </div>
  )
}
