"use client"

import Link from "next/link"
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BreakdownCard } from "@/components/breakdown-card"
import { ContextualChat } from "@/components/contextual-chat"
import { formatGBP, formatPct } from "@/lib/utils"
import type { Snapshot, NetWorthBreakdown, FxRates, Bucket } from "@/types/database"

const GOAL = 1_000_000

function AllocationBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function TabWealth({
  snapshot,
  prevSnapshot,
  nw,
  prevNw,
  fx,
  buckets,
  estimatedYear,
}: {
  snapshot: Snapshot
  prevSnapshot: Snapshot | null
  nw: NetWorthBreakdown
  prevNw: NetWorthBreakdown | null
  fx: FxRates
  buckets: Bucket[]
  estimatedYear: number
}) {
  const changeGbp = prevNw ? nw.total_gbp - prevNw.total_gbp : 0
  const changePct = prevNw ? (changeGbp / prevNw.total_gbp) * 100 : 0
  const progressPct = Math.min((nw.total_gbp / GOAL) * 100, 100)

  const stocksPct = Math.round((nw.investments_gbp / nw.total_gbp) * 100)
  const pensionPct = Math.round((nw.pension_gbp / nw.total_gbp) * 100)
  const cashPct = Math.round((nw.savings_gbp / nw.total_gbp) * 100)
  const bondsPct = Math.round(((snapshot.inv_bonds_usd * fx.usdToGbp) / nw.total_gbp) * 100)

  const currentMonth = new Date().getMonth() + 1
  const potsReservedUsd = buckets.reduce((sum, b) => sum + b.monthly_contribution_usd * currentMonth, 0)
  const potsReservedGbp = potsReservedUsd * fx.usdToGbp
  const lloydsGbp = snapshot.savings_lloyds_gbp ?? 0
  const lloydsLibreGbp = lloydsGbp - potsReservedGbp

  const chatContext = {
    netWorth: Math.round(nw.total_gbp),
    vsLastMonth: Math.round(changeGbp),
    progressToGoal: `${progressPct.toFixed(1)}%`,
    estimatedYear,
    allocation: { stocks: `${stocksPct}%`, pension: `${pensionPct}%`, cash: `${cashPct}%`, bonds: `${bondsPct}%` },
    cashflow: {
      salary: snapshot.salary_gbp,
      needs: snapshot.total_needs_gbp,
      wants: snapshot.total_wants_gbp,
      leftToSave: snapshot.left_to_save_gbp,
    },
  }

  return (
    <div className="space-y-6">
      {/* Net worth hero */}
      <Card className="bg-slate-900 text-white border-0">
        <CardContent className="pt-6 pb-6">
          <p className="text-sm text-slate-400 mb-1">Patrimonio neto total</p>
          <div className="flex items-end gap-4 flex-wrap">
            <span className="text-5xl font-bold tracking-tight">{formatGBP(nw.total_gbp)}</span>
            {prevNw && (
              <span className={`flex items-center gap-1 text-sm font-medium mb-1 ${changeGbp >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {changeGbp >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {changeGbp >= 0 ? "+" : ""}{formatGBP(changeGbp)} ({formatPct(changePct)})
              </span>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{progressPct.toFixed(1)}% de {formatGBP(GOAL)}</span>
              <span className="text-slate-400">Año estimado: {estimatedYear}</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-700">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BreakdownCard
          label="Inversiones"
          value={nw.investments_gbp}
          desc="MA · MELI · VUSA · Bonds — click para ver"
          lines={[
            { label: "Mastercard", value: snapshot.inv_mastercard_gbp > 0 ? snapshot.inv_mastercard_gbp : snapshot.inv_mastercard_shares * 435 },
            { label: "MercadoLibre", value: snapshot.inv_meli_gbp > 0 ? snapshot.inv_meli_gbp : snapshot.inv_meli_shares * 1580 },
            { label: "VUSA Vanguard", value: snapshot.inv_vusa_vanguard_gbp },
            { label: "VUSA ISA", value: snapshot.inv_vusa_isa_gbp },
            { label: "Bonos (USD→£)", value: snapshot.inv_bonds_usd * fx.usdToGbp },
          ]}
        />
        <BreakdownCard
          label="Pensión"
          value={nw.pension_gbp}
          desc="L&G · Vanguard SIPP — click para ver"
          lines={[
            { label: "L&G", value: snapshot.pension_lg_gbp },
            { label: "Vanguard SIPP", value: snapshot.pension_vanguard_gbp },
          ]}
        />
        <BreakdownCard
          label="Ahorros"
          value={nw.savings_gbp}
          desc="Lloyds · Marcus · Revolut — click para ver"
          lines={[
            { label: "Lloyds (total)", value: lloydsGbp },
            { label: "  └ pots reservados", value: -potsReservedGbp },
            { label: "  └ Lloyds libre", value: lloydsLibreGbp },
            { label: "Marcus", value: snapshot.savings_marcus_gbp },
            { label: "Revolut £", value: snapshot.savings_revolut_gbp },
            { label: "Revolut $ (→£)", value: snapshot.savings_revolut_usd * fx.usdToGbp },
            { label: "Revolut € (→£)", value: snapshot.savings_revolut_eur * fx.eurToGbp },
          ]}
        />
        <BreakdownCard
          label="Bonus / LTIPs"
          value={nw.bonus_gbp}
          desc="Cash solamente (no SIPP) — click para ver"
          lines={[
            { label: "Bonus cash", value: snapshot.bonus_gbp },
            { label: "LTIPs", value: snapshot.ltips_gbp },
          ]}
        />
      </div>

      {/* Allocation + Cashflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700">Asignación de cartera</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AllocationBar label="Acciones" pct={stocksPct} color="bg-blue-500" />
            <AllocationBar label="Pensión" pct={pensionPct} color="bg-violet-500" />
            <AllocationBar label="Efectivo" pct={cashPct} color="bg-amber-400" />
            <AllocationBar label="Bonos" pct={bondsPct} color="bg-emerald-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700">Cashflow este mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Salario</span>
              <span className="font-medium">{formatGBP(snapshot.salary_gbp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gastos necesarios</span>
              <span className="font-medium text-slate-700">− {formatGBP(snapshot.total_needs_gbp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gastos discrecionales</span>
              <span className="font-medium text-slate-700">− {formatGBP(snapshot.total_wants_gbp)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-sm font-semibold">
              <span className="text-slate-700">Left to save</span>
              <span className={snapshot.left_to_save_gbp >= 0 ? "text-emerald-600" : "text-red-600"}>
                {formatGBP(snapshot.left_to_save_gbp)}
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link href="/snapshot/new" className="flex items-center gap-2">
                Actualizar números <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <ContextualChat
        tab="wealth"
        context={chatContext}
        placeholder="¿Tengo demasiado cash? ¿Cómo está mi asignación?"
      />
    </div>
  )
}
