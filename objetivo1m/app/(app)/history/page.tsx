import { createClient } from "@/lib/supabase/server"
import { calcNetWorth } from "@/lib/net-worth"
import { formatGBP, formatPct } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import HistoryCharts from "./charts"
import type { Snapshot } from "@/types/database"

async function getPrices() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${base}/api/prices`, { next: { revalidate: 900 } })
    return res.json()
  } catch {
    return { fx: { usdToGbp: 0.79, eurToGbp: 0.86 }, prices: { ma: 435, meli: 1580 } }
  }
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("snapshots")
    .select("*")
    .order("snapshot_date", { ascending: true })

  const { fx, prices } = await getPrices()

  const snapshots = (data ?? []) as Snapshot[]

  const rows = snapshots.map((s) => {
    const nw = calcNetWorth(s, prices, fx)
    return {
      id: s.id,
      date: s.snapshot_date,
      year: s.year,
      month: s.month,
      total_gbp: nw.total_gbp,
      investments_gbp: nw.investments_gbp,
      pension_gbp: nw.pension_gbp,
      savings_gbp: nw.savings_gbp,
      left_to_save: s.left_to_save_gbp,
    }
  })

  // Year-end summaries
  const years = [...new Set(rows.map((r) => r.year))]
  const yearEnds = years.map((y) => {
    const yearRows = rows.filter((r) => r.year === y)
    const last = yearRows[yearRows.length - 1]
    const first = yearRows[0]
    const prev = rows.filter((r) => r.year === y - 1)
    const prevEnd = prev[prev.length - 1]
    const growth = prevEnd ? ((last.total_gbp - prevEnd.total_gbp) / prevEnd.total_gbp) * 100 : null
    return { year: y, total_gbp: last.total_gbp, growth }
  })

  // Chart data — monthly net worth
  const chartData = rows.map((r) => ({
    label: `${r.year}-${String(r.month).padStart(2, "0")}`,
    total: Math.round(r.total_gbp),
    investments: Math.round(r.investments_gbp),
    pension: Math.round(r.pension_gbp),
  }))

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Historial</h1>

      {/* Year-end summary table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Resumen anual</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {yearEnds.map((y) => (
              <div key={y.year} className="text-center border rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">{y.year}</p>
                <p className="text-xl font-bold">{formatGBP(y.total_gbp)}</p>
                {y.growth !== null && (
                  <p className={`text-xs mt-1 font-medium ${y.growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatPct(y.growth)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <HistoryCharts data={chartData} />

      {/* All snapshots table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Todos los snapshots</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {[...rows].reverse().map((r) => (
              <Link
                key={r.id}
                href={`/snapshot/${r.id}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 text-sm transition-colors group"
              >
                <span className="text-slate-500">
                  {new Date(r.date).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                </span>
                <span className="font-semibold text-slate-900 group-hover:text-blue-600">
                  {formatGBP(r.total_gbp)}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
