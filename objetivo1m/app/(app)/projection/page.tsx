"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { calcNetWorth, projectToGoal } from "@/lib/net-worth"
import { formatGBP } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts"
import type { Snapshot } from "@/types/database"

const GOAL = 1_000_000
const ANNUAL_GOAL_2026 = 70_000

function buildProjectionData(
  startValue: number,
  monthly: number,
  rates: number[],
  labels: string[],
  months = 240
) {
  const series: Record<string, number[]>[] = []
  const xLabels: string[] = []

  const values = rates.map(() => startValue)
  const now = new Date()

  for (let m = 0; m <= months; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1)
    if (m % 12 === 0 || m === 0) {
      const point: Record<string, number> = { year: d.getFullYear() }
      rates.forEach((r, i) => {
        point[labels[i]] = Math.round(values[i])
      })
      series.push(point as unknown as Record<string, number[]>)
    }
    rates.forEach((r, i) => {
      values[i] = values[i] * (1 + r / 12) + monthly
    })
  }
  return series
}

export default function ProjectionPage() {
  const supabase = createClient()
  const [current, setCurrent] = useState<Snapshot | null>(null)
  const [nwGbp, setNwGbp] = useState(436_022)
  const [monthly, setMonthly] = useState(500)
  const [loading, setLoading] = useState(true)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    async function load() {
      const [pricesRes, { data: snaps }] = await Promise.all([
        fetch("/api/prices").then((r) => r.json()),
        supabase.from("snapshots").select("*").order("snapshot_date", { ascending: false }).limit(1),
      ])
      if (snaps?.[0]) {
        const snap = snaps[0] as Snapshot
        setCurrent(snap)
        setMonthly(snap.monthly_contribution_gbp || 500)
        const nw = calcNetWorth(snap, pricesRes.prices ?? { ma: 435, meli: 1580 }, pricesRes.fx ?? { usdToGbp: 0.79, eurToGbp: 0.86 })
        setNwGbp(nw.total_gbp)
      }
      setLoading(false)
    }
    load()
  }, [])

  const rates = [0.07, 0.10, 0.12]
  const labels = ["Conservador (7%)", "Base (10%)", "Optimista (12%)"]
  const chartData = buildProjectionData(nwGbp, monthly, rates, labels, 240)

  const scenarios = rates.map((r, i) => ({
    label: labels[i],
    ...projectToGoal(nwGbp, monthly, r),
  }))

  // End of year projection
  const monthsLeft = 12 - new Date().getMonth()
  const eoyProjection = nwGbp + monthly * monthsLeft
  const savedThisYear = current
    ? (current.left_to_save_gbp || 0) * (12 - monthsLeft)
    : 0
  const onTrack = eoyProjection >= (nwGbp - savedThisYear) + ANNUAL_GOAL_2026

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Proyección</h1>

      {/* Horizon 1: End of year */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Patrimonio actual</p>
            <p className="text-xl font-bold">{formatGBP(nwGbp)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Proyección Dec {currentYear} (lineal)</p>
            <p className="text-xl font-bold">{formatGBP(eoyProjection)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Goal {currentYear}</p>
            <p className="text-xl font-bold">{formatGBP(ANNUAL_GOAL_2026)}</p>
            <Badge variant={onTrack ? "success" : "warning"} className="mt-1">
              {onTrack ? "On track" : "Behind"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Escenarios — camino al {formatGBP(GOAL)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {scenarios.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className="text-lg font-bold text-slate-900">
                  {Math.ceil(s.years)} años
                </p>
                <p className="text-xs text-slate-400">
                  {new Date().getFullYear() + Math.ceil(s.years)}
                </p>
              </div>
            ))}
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <Tooltip formatter={(v) => formatGBP(Number(v))} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={GOAL} stroke="#10b981" strokeDasharray="4 4" label={{ value: "£1M", fontSize: 10 }} />
                <Line dataKey={labels[0]} stroke="#94a3b8" dot={false} strokeWidth={1.5} />
                <Line dataKey={labels[1]} stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line dataKey={labels[2]} stroke="#10b981" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* What if slider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">¿Y si cambio la contribución mensual?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Contribución mensual: {formatGBP(monthly)}</Label>
            <input
              type="range"
              min={100}
              max={3000}
              step={50}
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[0.07, 0.10, 0.12].map((r, i) => {
              const result = projectToGoal(nwGbp, monthly, r)
              return (
                <div key={i} className="text-center border rounded-lg p-3">
                  <p className="text-xs text-slate-500">{[7, 10, 12][i]}% rendimiento</p>
                  <p className="text-lg font-bold">{Math.ceil(result.years)} años</p>
                  <p className="text-xs text-slate-400">{new Date().getFullYear() + Math.ceil(result.years)}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
