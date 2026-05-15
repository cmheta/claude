"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ContextualChat } from "@/components/contextual-chat"
import { calcNetWorth, projectToGoal } from "@/lib/net-worth"
import { formatGBP } from "@/lib/utils"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts"
import type { Snapshot, NetWorthBreakdown, FxRates } from "@/types/database"

const GOAL = 1_000_000
const ANNUAL_GOAL_USD = 70_000

function buildProjectionData(start: number, monthly: number, rates: number[], labels: string[], months = 240) {
  const values = rates.map(() => start)
  const now = new Date()
  const series: Record<string, number>[] = []

  for (let m = 0; m <= months; m++) {
    if (m % 12 === 0) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1)
      const point: Record<string, number> = { year: d.getFullYear() }
      labels.forEach((l, i) => { point[l] = Math.round(values[i]) })
      series.push(point)
    }
    rates.forEach((r, i) => { values[i] = values[i] * (1 + r / 12) + monthly })
  }
  return series
}

export function TabProjection({
  nw,
  snapshot,
  fx,
}: {
  nw: NetWorthBreakdown
  snapshot: Snapshot
  fx: FxRates
}) {
  const [monthly, setMonthly] = useState(snapshot.monthly_contribution_gbp || 500)

  const rates = [0.07, 0.10, 0.12]
  const labels = ["Conservador (7%)", "Base (10%)", "Optimista (12%)"]
  const chartData = buildProjectionData(nw.total_gbp, monthly, rates, labels, 240)

  const scenarios = rates.map((r, i) => ({ label: labels[i], ...projectToGoal(nw.total_gbp, monthly, r) }))

  const monthsLeft = 12 - new Date().getMonth()
  const eoyProjection = nw.total_gbp + monthly * monthsLeft
  const annualGoalGbp = ANNUAL_GOAL_USD * fx.usdToGbp
  const onTrack = eoyProjection >= nw.total_gbp + annualGoalGbp * (monthsLeft / 12)
  const currentYear = new Date().getFullYear()

  const chatContext = {
    netWorth: Math.round(nw.total_gbp),
    monthlyContribution: monthly,
    scenarios: scenarios.map((s) => ({ rate: s.label, years: Math.ceil(s.years), year: currentYear + Math.ceil(s.years) })),
    eoyProjection: Math.round(eoyProjection),
    annualGoalGbp: Math.round(annualGoalGbp),
    onTrack,
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Proyección</h2>

      {/* End of year horizon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Patrimonio actual</p>
            <p className="text-xl font-bold">{formatGBP(nw.total_gbp)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Proyección Dec {currentYear}</p>
            <p className="text-xl font-bold">{formatGBP(eoyProjection)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Goal {currentYear} ($70k USD → £)</p>
            <p className="text-xl font-bold">{formatGBP(annualGoalGbp)}</p>
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
                <p className="text-lg font-bold">{Math.ceil(s.years)} años</p>
                <p className="text-xs text-slate-400">{currentYear + Math.ceil(s.years)}</p>
              </div>
            ))}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={60} />
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
              const result = projectToGoal(nw.total_gbp, monthly, r)
              return (
                <div key={i} className="text-center border rounded-lg p-3">
                  <p className="text-xs text-slate-500">{[7, 10, 12][i]}% rendimiento</p>
                  <p className="text-lg font-bold">{Math.ceil(result.years)} años</p>
                  <p className="text-xs text-slate-400">{currentYear + Math.ceil(result.years)}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <ContextualChat
        tab="projection"
        context={chatContext}
        placeholder="¿Qué pasa si pongo el bono entero en VUSA?"
      />
    </div>
  )
}
