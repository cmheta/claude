"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ContextualChat } from "@/components/contextual-chat"
import { formatGBP } from "@/lib/utils"
import { Zap, RefreshCw } from "lucide-react"
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
}

const CHALLENGE_PROMPT = `You are a sharp, direct financial advisor challenging this investor's portfolio and assumptions. Her goal is £1,000,000.

Generate exactly 4 "challenges" — things she could be doing differently, optimising, or thinking about that she probably hasn't fully considered. Draw on what successful long-term investors (Buffett, index fund theory, tax efficiency, behavioral finance) actually do.

Be specific to HER numbers. Challenge her assumptions. Don't just validate — push back where appropriate. Be provocative but constructive.

Format: exactly 4 items, each starting with [CHALLENGE] on its own line, then a short punchy title line, then 2-3 lines of specific analysis with her £ numbers.

Example format:
[CHALLENGE]
Why are you holding bonds at your age?
At 35 with a 20-year horizon, your £31k in US bonds is earning ~4.5% when your VUSA has returned 12%+ annually. That's £X,000/year in opportunity cost. Bonds make sense at 55. Consider phasing them into VUSA over 2 years.`

type ChallengeItem = {
  title: string
  body: string
}

function peerStatus(her: number, median: number, good: number, higherIsBetter = true) {
  const aboveGood = higherIsBetter ? her >= good : her <= good
  const aboveMedian = higherIsBetter ? her >= median : her <= median
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
  const [challenges, setChallenges] = useState<ChallengeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)

  const savingsRate = snapshot.salary_gbp > 0
    ? Math.round((snapshot.left_to_save_gbp / snapshot.salary_gbp) * 100)
    : 0
  const stocksPct = Math.round((nw.investments_gbp / nw.total_gbp) * 100)
  const pensionPct = Math.round((nw.pension_gbp / nw.total_gbp) * 100)
  const cashPct = Math.round((nw.savings_gbp / nw.total_gbp) * 100)

  const nwStatus = peerStatus(nw.total_gbp, PEER.median_net_worth, PEER.top_25_pct_net_worth)
  const srStatus = peerStatus(savingsRate, PEER.median_savings_rate_pct, PEER.good_savings_rate_pct)
  const stocksStatus = peerStatus(stocksPct, PEER.median_stocks_pct, PEER.good_stocks_pct)

  const chatContext = {
    netWorth: Math.round(nw.total_gbp),
    breakdown: {
      investments: Math.round(nw.investments_gbp),
      pension: Math.round(nw.pension_gbp),
      savings: Math.round(nw.savings_gbp),
      bonus: Math.round(nw.bonus_gbp),
    },
    allocation: {
      stocks: `${stocksPct}%`,
      pension: `${pensionPct}%`,
      cash: `${cashPct}%`,
    },
    cashflow: {
      salary: snapshot.salary_gbp,
      leftToSave: snapshot.left_to_save_gbp,
      savingsRate: `${savingsRate}%`,
      monthlyInvestment: snapshot.monthly_contribution_gbp,
    },
    holdings: {
      mastercard_gbp: snapshot.inv_mastercard_gbp,
      meli_gbp: snapshot.inv_meli_gbp,
      vusa_vanguard_gbp: snapshot.inv_vusa_vanguard_gbp,
      vusa_isa_gbp: snapshot.inv_vusa_isa_gbp,
      bonds_usd: snapshot.inv_bonds_usd,
      pension_lg: snapshot.pension_lg_gbp,
      pension_vanguard: snapshot.pension_vanguard_gbp,
      marcus_gbp: snapshot.savings_marcus_gbp,
    },
    peer: {
      medianNetWorth: PEER.median_net_worth,
      medianSavingsRate: `${PEER.median_savings_rate_pct}%`,
      medianStocks: `${PEER.median_stocks_pct}%`,
    },
  }

  function parseChallenges(text: string): ChallengeItem[] {
    const chunks = text.split(/\[CHALLENGE\]/).filter((s) => s.trim())
    return chunks.map((chunk) => {
      const lines = chunk.trim().split("\n").filter(Boolean)
      return {
        title: lines[0]?.trim() ?? "Challenge",
        body: lines.slice(1).join(" ").trim(),
      }
    })
  }

  async function runChallenge() {
    setLoading(true)
    setChallenges([])
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: "benchmark",
          message: CHALLENGE_PROMPT,
          context: chatContext,
          history: [],
        }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
      }
      setChallenges(parseChallenges(full))
      setRan(true)
    } catch {
      setChallenges([{ title: "Error", body: "No se pudo conectar con el análisis. Intentá de nuevo." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">¿Voy bien?</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Comparativa vs professionals en Londres, 30–38 años, £80–120k. Fuente: ONS/FCA 2022.
        </p>
      </div>

      {/* Peer comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs text-slate-500">Patrimonio neto</p>
            <p className="text-2xl font-bold">{formatGBP(nw.total_gbp)}</p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Mediana: {formatGBP(PEER.median_net_worth)}</p>
              <p>Top 25%: {formatGBP(PEER.top_25_pct_net_worth)}</p>
              <p>Top 10%: {formatGBP(PEER.top_10_pct_net_worth)}</p>
            </div>
            <Badge variant={nwStatus.variant}>{nwStatus.label}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs text-slate-500">Tasa de ahorro</p>
            <p className="text-2xl font-bold">{savingsRate}%</p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Mediana: {PEER.median_savings_rate_pct}%</p>
              <p>Objetivo: {PEER.good_savings_rate_pct}%+</p>
              <p>{formatGBP(snapshot.left_to_save_gbp)}/mes</p>
            </div>
            <Badge variant={srStatus.variant}>{srStatus.label}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs text-slate-500">% en acciones</p>
            <p className="text-2xl font-bold">{stocksPct}%</p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Mediana: {PEER.median_stocks_pct}%</p>
              <p>Objetivo: {PEER.good_stocks_pct}%+</p>
              <p>{formatGBP(nw.investments_gbp)}</p>
            </div>
            <Badge variant={stocksStatus.variant}>{stocksStatus.label}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Peer visual bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700">Posición vs peers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Patrimonio neto", her: nw.total_gbp, top: PEER.top_10_pct_net_worth, median: PEER.median_net_worth, fmt: (v: number) => formatGBP(v) },
            { label: "Tasa de ahorro", her: savingsRate, top: PEER.good_savings_rate_pct, median: PEER.median_savings_rate_pct, fmt: (v: number) => `${v}%` },
            { label: "Exposición acciones", her: stocksPct, top: PEER.good_stocks_pct, median: PEER.median_stocks_pct, fmt: (v: number) => `${v}%` },
          ].map(({ label, her, top, median, fmt }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{label}</span>
                <span className="font-medium text-slate-700">{fmt(her)}</span>
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((her / top) * 100, 100)}%` }} />
                <div className="absolute top-0 h-full w-0.5 bg-slate-400" style={{ left: `${(median / top) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-400">Mediana: {fmt(median)} · Top: {fmt(top)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Challenge section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Desafíos para tu cartera
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              IA analiza tu portfolio específico y te desafía — ideas que quizás no consideraste
            </p>
          </div>
          <Button onClick={runChallenge} disabled={loading} size="sm" variant={ran ? "outline" : "default"} className="flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analizando..." : ran ? "Regenerar" : "Desafiarme"}
          </Button>
        </div>

        {!loading && !challenges.length && (
          <div className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 gap-2">
            <Zap className="w-7 h-7" />
            <p className="text-sm">Hacé click en "Desafiarme" para ver qué podrías optimizar</p>
          </div>
        )}

        {loading && !challenges.length && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        )}

        {challenges.length > 0 && (
          <div className="space-y-3">
            {challenges.map((c, i) => (
              <Card key={i} className="border-amber-200 bg-amber-50">
                <CardContent className="py-4 flex items-start gap-3">
                  <span className="text-amber-500 font-bold text-sm shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{c.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ContextualChat
        tab="benchmark"
        context={chatContext}
        placeholder="¿Por qué tengo menos % en acciones que la mediana?"
      />
    </div>
  )
}
