"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ContextualChat } from "@/components/contextual-chat"
import { RefreshCw, Clock } from "lucide-react"
import type { NetWorthBreakdown, Snapshot, FxRates } from "@/types/database"

type MacroItem = {
  dot: "red" | "green" | "amber"
  event: string
  impact: string
}

const MACRO_PROMPT = `Analyze the top 3-5 macro events relevant to this investor's portfolio. Holdings: Mastercard (MA), MercadoLibre (MELI), Vanguard S&P500 (VUSA), USD Treasuries/bonds, GBP/USD exposure.

For each event provide:
1. One line: what happened (be current and specific)
2. One line: specific impact on her holdings in £ if quantifiable

Focus on: Fed rates, USD/GBP, LatAm macro, S&P500 performance, fintech regulation, consumer spending trends.

Format your response as exactly 4 items, each starting with [GREEN], [RED], or [AMBER] on its own line, followed by the event line, then the impact line. Example:
[GREEN]
S&P 500 hit new highs in Q1 2025, up 8% YTD.
Your VUSA ISA (£105k) and Vanguard (£50k) benefit directly — combined +£12k on paper.`

export function TabMacro({
  nw,
  snapshot,
  fx,
}: {
  nw: NetWorthBreakdown
  snapshot: Snapshot
  fx: FxRates
}) {
  const [items, setItems] = useState<MacroItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [rawText, setRawText] = useState("")

  const chatContext = {
    holdings: {
      mastercard_gbp: snapshot.inv_mastercard_gbp || snapshot.inv_mastercard_shares * 435,
      meli_gbp: snapshot.inv_meli_gbp || snapshot.inv_meli_shares * 1580,
      vusa_total_gbp: snapshot.inv_vusa_vanguard_gbp + snapshot.inv_vusa_isa_gbp,
      bonds_usd: snapshot.inv_bonds_usd,
      bonds_gbp: Math.round(snapshot.inv_bonds_usd * fx.usdToGbp),
    },
    fx: { usdToGbp: fx.usdToGbp, eurToGbp: fx.eurToGbp },
    totalInvestments: Math.round(nw.investments_gbp),
  }

  function parseItems(text: string): MacroItem[] {
    const chunks = text.split(/\[(GREEN|RED|AMBER)\]/).filter(Boolean)
    const results: MacroItem[] = []
    let i = 0
    while (i < chunks.length - 1) {
      const dot = (chunks[i].trim() as "green" | "red" | "amber") || "amber"
      const lines = chunks[i + 1].trim().split("\n").filter(Boolean)
      if (lines.length >= 2) {
        results.push({
          dot: dot.toLowerCase() as "red" | "green" | "amber",
          event: lines[0].trim(),
          impact: lines.slice(1).join(" ").trim(),
        })
      }
      i += 2
    }
    return results
  }

  async function refresh() {
    setLoading(true)
    setRawText("")
    setItems([])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: "macro",
          message: MACRO_PROMPT,
          context: chatContext,
          history: [],
        }),
      })

      if (!res.ok || !res.body) throw new Error("Error")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setRawText(full)
      }

      const parsed = parseItems(full)
      if (parsed.length > 0) {
        setItems(parsed)
      } else {
        // Fallback: show raw text if parsing failed
        setItems([{ dot: "amber", event: "Análisis macro", impact: full }])
      }
      setLastUpdated(new Date())
    } catch {
      setItems([{ dot: "red", event: "Error al conectar", impact: "Intenta de nuevo." }])
    } finally {
      setLoading(false)
    }
  }

  const dotColor = { red: "bg-red-500", green: "bg-emerald-500", amber: "bg-amber-400" }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Qué pasa en el mundo</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Macro traducido a tu cartera — análisis bajo demanda con Claude
          </p>
        </div>
        <Button onClick={refresh} disabled={loading} size="sm" className="flex items-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analizando..." : items.length ? "Actualizar" : "Analizar"}
        </Button>
      </div>

      {lastUpdated && (
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Última actualización: {lastUpdated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {loading && !items.length && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !items.length && (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 gap-2">
          <RefreshCw className="w-8 h-8" />
          <p className="text-sm">Haz clic en "Analizar" para ver el macro de esta semana</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, i) => (
            <Card key={i}>
              <CardContent className="py-4 flex items-start gap-3">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${dotColor[item.dot]}`} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.event}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.impact}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ContextualChat
        tab="macro"
        context={chatContext}
        placeholder="¿Debería preocuparme por el dólar para mis bonos?"
      />
    </div>
  )
}
