"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatGBP } from "@/lib/utils"

type DataPoint = {
  label: string
  total: number
  investments: number
  pension: number
}

export default function HistoryCharts({ data }: { data: DataPoint[] }) {
  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Evolución del patrimonio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval={Math.floor(data.length / 8)}
              />
              <YAxis
                tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                width={60}
              />
              <Tooltip formatter={(v) => formatGBP(Number(v))} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="total" name="Patrimonio total" stroke="#0f172a" dot={false} strokeWidth={2.5} />
              <Line dataKey="investments" name="Inversiones" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
              <Line dataKey="pension" name="Pensión" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
