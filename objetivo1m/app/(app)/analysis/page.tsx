"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { calcNetWorth, projectToGoal } from "@/lib/net-worth"
import { formatGBP } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Copy, Check, Clock } from "lucide-react"
import type { Snapshot, AiAnalysis } from "@/types/database"

export default function AnalysisPage() {
  const supabase = createClient()
  const [streaming, setStreaming] = useState(false)
  const [text, setText] = useState("")
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<AiAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const textareaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from("ai_analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setHistory(data as AiAnalysis[])
        setLoading(false)
      })
  }, [])

  async function buildContext() {
    const [pricesRes, { data: snaps }, { data: buckets }, { data: txns }] = await Promise.all([
      fetch("/api/prices").then((r) => r.json()),
      supabase.from("snapshots").select("*").order("snapshot_date", { ascending: false }).limit(10),
      supabase.from("buckets").select("*").eq("year", new Date().getFullYear()),
      supabase.from("bucket_transactions").select("*"),
    ])

    const currentMonth = new Date().getMonth() + 1
    const fx = pricesRes.fx ?? { usdToGbp: 0.79, eurToGbp: 0.86 }
    const prices = pricesRes.prices ?? { ma: 435, meli: 1580 }

    const current = snaps?.[0] as Snapshot | undefined
    const previous = snaps?.[1] as Snapshot | undefined

    if (!current) return null

    const nw = calcNetWorth(current, prices, fx)
    const prevNw = previous ? calcNetWorth(previous, prices, fx) : null
    const changeGbp = prevNw ? nw.total_gbp - prevNw.total_gbp : 0
    const changePct = prevNw ? (changeGbp / prevNw.total_gbp) * 100 : 0
    const { years } = projectToGoal(nw.total_gbp, current.monthly_contribution_gbp || 500, 0.10)

    // Bucket balances
    const bucketBalances: Record<string, number> = {}
    for (const b of buckets ?? []) {
      const accumulated = b.monthly_contribution_usd * currentMonth
      const spent = (txns ?? [])
        .filter((t) => t.bucket_id === b.id && t.amount_usd < 0)
        .reduce((s: number, t: { amount_usd: number }) => s + Math.abs(t.amount_usd), 0)
      bucketBalances[`${b.bucket_name}_balance_usd`] = accumulated - spent
    }

    const history = (snaps ?? []).slice(0, 5).reverse().map((s: Snapshot) => {
      const n = calcNetWorth(s, prices, fx)
      return { year: s.year, month: s.month, total_gbp: Math.round(n.total_gbp) }
    })

    return {
      snapshotId: current.id,
      currentDate: new Date().toISOString().slice(0, 10),
      netWorth: {
        total_gbp: Math.round(nw.total_gbp),
        vs_last_month_gbp: Math.round(changeGbp),
        vs_last_month_pct: parseFloat(changePct.toFixed(1)),
      },
      breakdown: {
        investments_gbp: Math.round(nw.investments_gbp),
        pension_gbp: Math.round(nw.pension_gbp),
        savings_gbp: Math.round(nw.savings_gbp),
        bonus_gbp: Math.round(nw.bonus_gbp),
      },
      portfolio: {
        mastercard_shares: current.inv_mastercard_shares,
        mastercard_price_gbp: Math.round(prices.ma),
        mastercard_value_gbp: Math.round(current.inv_mastercard_shares * prices.ma),
        meli_shares: current.inv_meli_shares,
        meli_price_gbp: Math.round(prices.meli),
        meli_value_gbp: Math.round(current.inv_meli_shares * prices.meli),
        vusa_vanguard_gbp: current.inv_vusa_vanguard_gbp,
        vusa_isa_gbp: current.inv_vusa_isa_gbp,
        bonds_usd: current.inv_bonds_usd,
        bonds_gbp: Math.round(current.inv_bonds_usd * fx.usdToGbp),
      },
      allocation: {
        stocks_pct: Math.round((nw.investments_gbp / nw.total_gbp) * 100),
        pension_pct: Math.round((nw.pension_gbp / nw.total_gbp) * 100),
        cash_pct: Math.round((nw.savings_gbp / nw.total_gbp) * 100),
      },
      cashflow: {
        salary_gbp: current.salary_gbp,
        total_spend_gbp: current.total_needs_gbp + current.total_wants_gbp,
        left_to_save_gbp: current.left_to_save_gbp,
        monthly_investment_gbp: current.monthly_contribution_gbp,
      },
      buckets: bucketBalances,
      goal: {
        target_gbp: 1_000_000,
        progress_pct: parseFloat(((nw.total_gbp / 1_000_000) * 100).toFixed(1)),
        years_to_goal_base_case: parseFloat(years.toFixed(1)),
      },
      history,
    }
  }

  async function runAnalysis() {
    setStreaming(true)
    setText("")

    const context = await buildContext()
    if (!context) {
      setText("No hay snapshot disponible. Crea uno primero.")
      setStreaming(false)
      return
    }

    const res = await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    })

    if (!res.ok || !res.body) {
      setText("Error al conectar con Claude.")
      setStreaming(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      full += chunk
      setText(full)
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight
      }
    }

    setStreaming(false)
    // Refresh history
    const { data } = await supabase
      .from("ai_analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
    if (data) setHistory(data as AiAnalysis[])
  }

  async function copyText() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-6 h-6" /> Análisis IA
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Claude analiza tu cartera en tiempo real</p>
        </div>
        <Button onClick={runAnalysis} disabled={streaming}>
          {streaming ? "Analizando..." : text ? "Regenerar" : "Analizar cartera"}
        </Button>
      </div>

      {/* Streaming area */}
      {(text || streaming) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Análisis</CardTitle>
            {text && !streaming && (
              <Button variant="ghost" size="sm" onClick={copyText} className="gap-1.5 text-xs">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div
              ref={textareaRef}
              className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto"
            >
              {text}
              {streaming && <span className="inline-block w-1.5 h-4 bg-slate-400 animate-pulse ml-0.5 align-middle" />}
            </div>
          </CardContent>
        </Card>
      )}

      {!text && !streaming && (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 gap-2">
          <Brain className="w-8 h-8" />
          <p className="text-sm">Haz clic en "Analizar cartera" para empezar</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Análisis anteriores
          </h2>
          {history.map((a) => (
            <Card key={a.id} className="cursor-pointer hover:border-slate-400 transition-colors" onClick={() => setText(a.analysis_text)}>
              <CardContent className="py-3">
                <p className="text-xs text-slate-400 mb-1">
                  {new Date(a.created_at).toLocaleDateString("es-ES", {
                    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-slate-600 line-clamp-2">{a.analysis_text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
