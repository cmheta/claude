import { createClient } from "@/lib/supabase/server"
import { calcNetWorth, projectToGoal } from "@/lib/net-worth"
import { formatGBP, formatPct } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BreakdownCard } from "@/components/breakdown-card"
import Link from "next/link"
import { TrendingUp, TrendingDown, ArrowRight, Brain } from "lucide-react"
import type { Snapshot, Bucket } from "@/types/database"

const GOAL = 1_000_000

async function getPrices() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${base}/api/prices`, { next: { revalidate: 900 } })
    return res.json()
  } catch {
    return { fx: { usdToGbp: 0.79, eurToGbp: 0.86 }, prices: { ma: 435, meli: 1580 } }
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: snapshots }, { data: lastAnalysis }, { data: buckets }] = await Promise.all([
    supabase.from("snapshots").select("*").order("snapshot_date", { ascending: false }).limit(2),
    supabase.from("ai_analyses").select("analysis_text, created_at").order("created_at", { ascending: false }).limit(1),
    supabase.from("buckets").select("*").eq("year", new Date().getFullYear()),
  ])

  const { fx, prices } = await getPrices()

  const current = snapshots?.[0] as Snapshot | undefined
  const previous = snapshots?.[1] as Snapshot | undefined

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500 text-sm">No hay snapshots todavía.</p>
        <Button asChild><Link href="/snapshot/new">Crear primer snapshot</Link></Button>
      </div>
    )
  }

  const nw = calcNetWorth(current, prices, fx)
  const prevNw = previous ? calcNetWorth(previous, prices, fx) : null

  const changeGbp = prevNw ? nw.total_gbp - prevNw.total_gbp : 0
  const changePct = prevNw ? (changeGbp / prevNw.total_gbp) * 100 : 0
  const progressPct = Math.min((nw.total_gbp / GOAL) * 100, 100)

  const { years } = projectToGoal(nw.total_gbp, current.monthly_contribution_gbp || 500, 0.10)
  const estimatedYear = new Date().getFullYear() + Math.ceil(years)

  const stocksPct = Math.round((nw.investments_gbp / nw.total_gbp) * 100)
  const pensionPct = Math.round((nw.pension_gbp / nw.total_gbp) * 100)
  const cashPct = Math.round((nw.savings_gbp / nw.total_gbp) * 100)
  const bondsPct = Math.round(((current.inv_bonds_usd * fx.usdToGbp) / nw.total_gbp) * 100)

  // Pots reserved in Lloyds (accumulated so far this year, converted to GBP)
  const currentMonth = new Date().getMonth() + 1
  const potsReservedUsd = (buckets as Bucket[] ?? []).reduce(
    (sum, b) => sum + b.monthly_contribution_usd * currentMonth,
    0
  )
  const potsReservedGbp = potsReservedUsd * fx.usdToGbp
  const lloydsGbp = current.savings_lloyds_gbp ?? 0
  const lloydsLibreGbp = lloydsGbp - potsReservedGbp

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Snapshot:{" "}
            {new Date(current.snapshot_date).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/snapshot/new">+ Nuevo mes</Link>
        </Button>
      </div>

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
            { label: "Mastercard", value: current.inv_mastercard_gbp > 0 ? current.inv_mastercard_gbp : current.inv_mastercard_shares * prices.ma },
            { label: "MercadoLibre", value: current.inv_meli_gbp > 0 ? current.inv_meli_gbp : current.inv_meli_shares * prices.meli },
            { label: "VUSA Vanguard", value: current.inv_vusa_vanguard_gbp },
            { label: "VUSA ISA", value: current.inv_vusa_isa_gbp },
            { label: "Bonos (USD→£)", value: current.inv_bonds_usd * fx.usdToGbp },
          ]}
        />
        <BreakdownCard
          label="Pensión"
          value={nw.pension_gbp}
          desc="L&G · Vanguard SIPP — click para ver"
          lines={[
            { label: "L&G", value: current.pension_lg_gbp },
            { label: "Vanguard SIPP", value: current.pension_vanguard_gbp },
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
            { label: "Marcus", value: current.savings_marcus_gbp },
            { label: "Revolut £", value: current.savings_revolut_gbp },
            { label: "Revolut $ (→£)", value: current.savings_revolut_usd * fx.usdToGbp },
            { label: "Revolut € (→£)", value: current.savings_revolut_eur * fx.eurToGbp },
          ]}
        />
        <BreakdownCard
          label="Bonus / LTIPs"
          value={nw.bonus_gbp}
          desc="Cash solamente (no SIPP) — click para ver"
          lines={[
            { label: "Bonus cash", value: current.bonus_gbp },
            { label: "LTIPs", value: current.ltips_gbp },
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
              <span className="font-medium">{formatGBP(current.salary_gbp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gastos necesarios</span>
              <span className="font-medium text-slate-700">− {formatGBP(current.total_needs_gbp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gastos discrecionales</span>
              <span className="font-medium text-slate-700">− {formatGBP(current.total_wants_gbp)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-sm font-semibold">
              <span className="text-slate-700">Left to save</span>
              <span className={current.left_to_save_gbp >= 0 ? "text-emerald-600" : "text-red-600"}>
                {formatGBP(current.left_to_save_gbp)}
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

      {/* Last AI analysis */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Brain className="w-4 h-4" /> Último análisis IA
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/analysis">Ver / regenerar</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {lastAnalysis?.[0] ? (
            <div className="text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap">
              {lastAnalysis[0].analysis_text}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin análisis todavía. Ve a la página de Análisis IA.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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
