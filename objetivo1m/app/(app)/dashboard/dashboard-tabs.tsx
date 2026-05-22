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
import { useDemoMode } from "@/hooks/use-demo-mode"
import { calcNetWorth, projectToGoal } from "@/lib/net-worth"
import {
  DEMO_SNAPSHOT, DEMO_PREV_SNAPSHOT, DEMO_BUCKETS, DEMO_BUCKET_TRANSACTIONS,
  DEMO_NW, DEMO_PREV_NW, DEMO_FX, DEMO_PRICES,
} from "@/lib/demo-data"
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
  const { demo } = useDemoMode()

  const activeSnapshot = demo ? DEMO_SNAPSHOT : snapshot
  const activePrevSnapshot = demo ? DEMO_PREV_SNAPSHOT : prevSnapshot
  const activeNw = demo ? DEMO_NW : nw
  const activePrevNw = demo ? DEMO_PREV_NW : prevNw
  const activeFx = demo ? DEMO_FX : fx
  const activeBuckets = demo ? DEMO_BUCKETS : buckets

  const demoEstimatedYear = demo
    ? new Date().getFullYear() + Math.ceil(projectToGoal(DEMO_NW.total_gbp, DEMO_SNAPSHOT.monthly_contribution_gbp, 0.10).years)
    : estimatedYear

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Dashboard
            {demo && <span className="ml-2 text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">Demo · Sofia Reyes</span>}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(activeSnapshot.snapshot_date).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
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
            snapshot={activeSnapshot}
            prevSnapshot={activePrevSnapshot}
            nw={activeNw}
            prevNw={activePrevNw}
            fx={activeFx}
            buckets={activeBuckets}
            estimatedYear={demoEstimatedYear}
          />
        </TabsContent>

        <TabsContent value="benchmark">
          <TabBenchmark nw={activeNw} snapshot={activeSnapshot} />
        </TabsContent>

        <TabsContent value="macro">
          <TabMacro nw={activeNw} snapshot={activeSnapshot} fx={activeFx} />
        </TabsContent>

        <TabsContent value="buckets">
          <TabBuckets
            demoData={demo ? { buckets: DEMO_BUCKETS, transactions: DEMO_BUCKET_TRANSACTIONS } : undefined}
          />
        </TabsContent>

        <TabsContent value="projection">
          <TabProjection nw={activeNw} snapshot={activeSnapshot} fx={activeFx} />
        </TabsContent>

        <TabsContent value="tax">
          <TabTax snapshot={activeSnapshot} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
