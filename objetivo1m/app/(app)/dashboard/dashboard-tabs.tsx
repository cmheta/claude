"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TabWealth } from "./tab-wealth"
import { TabBenchmark } from "./tab-benchmark"
import { TabMacro } from "./tab-macro"
import { TabBuckets } from "./tab-buckets"
import { TabProjection } from "./tab-projection"
import { TabTax } from "./tab-tax"
import { Landmark, Users, Globe, PiggyBank, TrendingUp, Receipt } from "lucide-react"
import type { Snapshot, NetWorthBreakdown, FxRates, Bucket } from "@/types/database"

type Props = {
  snapshot: Snapshot
  prevSnapshot: Snapshot | null
  nw: NetWorthBreakdown
  prevNw: NetWorthBreakdown | null
  fx: FxRates
  buckets: Bucket[]
  estimatedYear: number
}

const TABS = [
  { id: "wealth", label: "Mi wealth", icon: Landmark },
  { id: "benchmark", label: "¿Voy bien?", icon: Users },
  { id: "macro", label: "Qué pasa", icon: Globe },
  { id: "buckets", label: "Pots", icon: PiggyBank },
  { id: "projection", label: "Proyección", icon: TrendingUp },
  { id: "tax", label: "Tax", icon: Receipt },
]

export function DashboardTabs({ snapshot, prevSnapshot, nw, prevNw, fx, buckets, estimatedYear }: Props) {
  const [tab, setTab] = useState("wealth")

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(snapshot.snapshot_date).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="wealth">
          <TabWealth
            snapshot={snapshot}
            prevSnapshot={prevSnapshot}
            nw={nw}
            prevNw={prevNw}
            fx={fx}
            buckets={buckets}
            estimatedYear={estimatedYear}
          />
        </TabsContent>

        <TabsContent value="benchmark">
          <TabBenchmark nw={nw} snapshot={snapshot} />
        </TabsContent>

        <TabsContent value="macro">
          <TabMacro nw={nw} snapshot={snapshot} fx={fx} />
        </TabsContent>

        <TabsContent value="buckets">
          <TabBuckets />
        </TabsContent>

        <TabsContent value="projection">
          <TabProjection nw={nw} snapshot={snapshot} fx={fx} />
        </TabsContent>

        <TabsContent value="tax">
          <TabTax snapshot={snapshot} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
