"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatUSD } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ContextualChat } from "@/components/contextual-chat"
import type { Bucket, BucketTransaction } from "@/types/database"

const BUCKET_LABELS: Record<string, string> = {
  vacaciones: "Vacaciones",
  educacion: "Educación",
  fun: "Fun",
  navidad: "Navidad",
}

const BUCKET_COLORS: Record<string, string> = {
  vacaciones: "bg-blue-500",
  educacion: "bg-violet-500",
  fun: "bg-pink-500",
  navidad: "bg-red-500",
}

type BucketWithBalance = Bucket & {
  accumulated: number
  spent: number
  balance: number
}

export function TabBuckets() {
  const supabase = createClient()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [buckets, setBuckets] = useState<BucketWithBalance[]>([])
  const [transactions, setTransactions] = useState<BucketTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [txAmount, setTxAmount] = useState("")
  const [txDesc, setTxDesc] = useState("")
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: bData }, { data: tData }] = await Promise.all([
      supabase.from("buckets").select("*").eq("user_id", user.id).eq("year", currentYear),
      supabase
        .from("bucket_transactions")
        .select("*, buckets!inner(year)")
        .eq("buckets.year", currentYear)
        .eq("user_id", user.id),
    ])

    let bucketData = bData ?? []
    if (bucketData.length === 0) {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        const defaults = [
          { user_id: u.id, year: currentYear, bucket_name: "vacaciones", annual_budget_usd: 5040, monthly_contribution_usd: 420 },
          { user_id: u.id, year: currentYear, bucket_name: "educacion", annual_budget_usd: 1800, monthly_contribution_usd: 150 },
          { user_id: u.id, year: currentYear, bucket_name: "fun", annual_budget_usd: 2664, monthly_contribution_usd: 222 },
          { user_id: u.id, year: currentYear, bucket_name: "navidad", annual_budget_usd: 576, monthly_contribution_usd: 48 },
        ]
        await supabase.from("buckets").insert(defaults)
        const { data: fresh } = await supabase.from("buckets").select("*").eq("user_id", u.id).eq("year", currentYear)
        bucketData = fresh ?? []
      }
    }

    const txData = tData ?? []
    const withBalance: BucketWithBalance[] = bucketData.map((b) => {
      const accumulated = b.monthly_contribution_usd * currentMonth
      const txs = txData.filter((t) => t.bucket_id === b.id)
      const spent = txs.filter((t) => t.amount_usd < 0).reduce((s, t) => s + Math.abs(t.amount_usd), 0)
      const extra = txs.filter((t) => t.amount_usd > 0).reduce((s, t) => s + t.amount_usd, 0)
      return { ...b, accumulated, spent, balance: accumulated + extra - spent }
    })
    setBuckets(withBalance)
    setTransactions(txData)
    setLoading(false)
  }, [currentYear, currentMonth, supabase])

  useEffect(() => { load() }, [load])

  async function addTransaction() {
    if (!addingTo || !txAmount) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("bucket_transactions").insert({
      user_id: user.id,
      bucket_id: addingTo,
      transaction_date: txDate,
      amount_usd: -Math.abs(parseFloat(txAmount)),
      description: txDesc || null,
    })
    setAddingTo(null)
    setTxAmount("")
    setTxDesc("")
    setSaving(false)
    load()
  }

  const totalBudget = buckets.reduce((s, b) => s + b.annual_budget_usd, 0)
  const totalSpent = buckets.reduce((s, b) => s + b.spent, 0)
  const totalBalance = buckets.reduce((s, b) => s + b.balance, 0)

  const chatContext = {
    buckets: buckets.map((b) => ({
      name: BUCKET_LABELS[b.bucket_name] ?? b.bucket_name,
      accumulated: b.accumulated,
      spent: b.spent,
      balance: b.balance,
      monthlyContrib: b.monthly_contribution_usd,
    })),
    totalBudget,
    totalSpent,
    totalBalance,
    month: currentMonth,
  }

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Cargando pots...</p>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Pots {currentYear}</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Budget anual: {formatUSD(totalBudget)} · Gastado: {formatUSD(totalSpent)} · Balance: {formatUSD(totalBalance)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {buckets.map((b) => {
          const spentPct = b.accumulated > 0 ? Math.min((b.spent / b.accumulated) * 100, 100) : 0
          const isOver = b.balance < 0
          const color = BUCKET_COLORS[b.bucket_name] ?? "bg-slate-500"

          return (
            <Card key={b.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {BUCKET_LABELS[b.bucket_name] ?? b.bucket_name}
                  </CardTitle>
                  <Badge variant={isOver ? "destructive" : "success"}>
                    {isOver ? "Over" : "OK"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 text-xs text-slate-500 gap-2">
                  <div>
                    <p>Acumulado</p>
                    <p className="font-semibold text-slate-800">{formatUSD(b.accumulated)}</p>
                  </div>
                  <div>
                    <p>Gastado</p>
                    <p className="font-semibold text-slate-800">{formatUSD(b.spent)}</p>
                  </div>
                  <div>
                    <p>Balance</p>
                    <p className={`font-bold ${isOver ? "text-red-600" : "text-emerald-600"}`}>
                      {formatUSD(b.balance)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${isOver ? "bg-red-500" : color} rounded-full`} style={{ width: `${spentPct}%` }} />
                  </div>
                  <p className="text-xs text-slate-400">{spentPct.toFixed(0)}% del acumulado · ${b.monthly_contribution_usd}/mes</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setAddingTo(b.id); setTxAmount(""); setTxDesc("") }}>
                  + Añadir gasto
                </Button>
                {transactions.filter((t) => t.bucket_id === b.id).slice(-3).reverse().map((t) => (
                  <div key={t.id} className="flex justify-between text-xs text-slate-500">
                    <span>{t.description ?? "Sin descripción"}</span>
                    <span className="text-red-500">−{formatUSD(Math.abs(t.amount_usd))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add transaction modal */}
      {addingTo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle className="text-sm">Añadir gasto</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cantidad (USD)</Label>
                <Input type="number" step="any" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Input value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="Ej: Vuelo a Barcelona" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setAddingTo(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={addTransaction} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ContextualChat
        tab="buckets"
        context={chatContext}
        placeholder="Educación está en rojo, ¿qué hago?"
      />
    </div>
  )
}
