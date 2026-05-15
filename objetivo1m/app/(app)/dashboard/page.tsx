import { createClient } from "@/lib/supabase/server"
import { calcNetWorth, projectToGoal } from "@/lib/net-worth"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DashboardTabs } from "./dashboard-tabs"
import type { Snapshot, Bucket } from "@/types/database"

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

  const [{ data: snapshots }, { data: buckets }] = await Promise.all([
    supabase.from("snapshots").select("*").order("snapshot_date", { ascending: false }).limit(2),
    supabase.from("buckets").select("*").eq("year", new Date().getFullYear()),
  ])

  const { fx, prices } = await getPrices()

  const snapshot = snapshots?.[0] as Snapshot | undefined
  const prevSnapshot = snapshots?.[1] as Snapshot | undefined

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500 text-sm">No hay snapshots todavía.</p>
        <Button asChild><Link href="/snapshot/new">Crear primer snapshot</Link></Button>
      </div>
    )
  }

  const nw = calcNetWorth(snapshot, prices, fx)
  const prevNw = prevSnapshot ? calcNetWorth(prevSnapshot, prices, fx) : null

  const { years } = projectToGoal(nw.total_gbp, snapshot.monthly_contribution_gbp || 500, 0.10)
  const estimatedYear = new Date().getFullYear() + Math.ceil(years)

  return (
    <DashboardTabs
      snapshot={snapshot}
      prevSnapshot={prevSnapshot ?? null}
      nw={nw}
      prevNw={prevNw}
      fx={fx}
      buckets={(buckets as Bucket[]) ?? []}
      estimatedYear={estimatedYear}
    />
  )
}
