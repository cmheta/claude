import { createClient } from "@/lib/supabase/server"
import { calcNetWorth } from "@/lib/net-worth"
import { formatGBP } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { notFound } from "next/navigation"
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

export default async function SnapshotDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data } = await supabase.from("snapshots").select("*").eq("id", id).single()
  if (!data) notFound()

  const snap = data as Snapshot
  const { fx, prices } = await getPrices()
  const nw = calcNetWorth(snap, prices, fx)

  const date = new Date(snap.snapshot_date).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Snapshot — {date}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Patrimonio total: {formatGBP(nw.total_gbp)}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/history">← Historial</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Inversiones</p>
            <p className="text-xl font-bold">{formatGBP(nw.investments_gbp)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Pensión</p>
            <p className="text-xl font-bold">{formatGBP(nw.pension_gbp)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Ahorros</p>
            <p className="text-xl font-bold">{formatGBP(nw.savings_gbp)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500">Bonus / LTIPs</p>
            <p className="text-xl font-bold">{formatGBP(nw.bonus_gbp)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Detalle</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="MA shares" value={`${snap.inv_mastercard_shares} × ${formatGBP(prices.ma)} = ${formatGBP(snap.inv_mastercard_shares * prices.ma)}`} />
          <Row label="MELI shares" value={`${snap.inv_meli_shares} × ${formatGBP(prices.meli)} = ${formatGBP(snap.inv_meli_shares * prices.meli)}`} />
          <Row label="VUSA Vanguard" value={formatGBP(snap.inv_vusa_vanguard_gbp)} />
          <Row label="VUSA ISA" value={formatGBP(snap.inv_vusa_isa_gbp)} />
          <Row label="Bonos USD" value={`$${snap.inv_bonds_usd.toLocaleString()} = ${formatGBP(snap.inv_bonds_usd * fx.usdToGbp)}`} />
          <Row label="LITG" value={formatGBP(snap.inv_litg_gbp)} />
          <div className="border-t pt-2 mt-2" />
          <Row label="L&G Pensión" value={formatGBP(snap.pension_lg_gbp)} />
          <Row label="Vanguard Pensión" value={formatGBP(snap.pension_vanguard_gbp)} />
          <div className="border-t pt-2 mt-2" />
          <Row label="Marcus" value={formatGBP(snap.savings_marcus_gbp)} />
          <Row label="Revolut £" value={formatGBP(snap.savings_revolut_gbp)} />
          <Row label="Revolut $" value={`$${snap.savings_revolut_usd} = ${formatGBP(snap.savings_revolut_usd * fx.usdToGbp)}`} />
          <Row label="Revolut €" value={`€${snap.savings_revolut_eur} = ${formatGBP(snap.savings_revolut_eur * fx.eurToGbp)}`} />
          <div className="border-t pt-2 mt-2" />
          <Row label="Bonus" value={formatGBP(snap.bonus_gbp)} />
          <Row label="LTIPs" value={formatGBP(snap.ltips_gbp)} />
          <div className="border-t pt-2 mt-2" />
          <Row label="Salario" value={formatGBP(snap.salary_gbp)} />
          <Row label="Left to save" value={formatGBP(snap.left_to_save_gbp)} />
          {snap.notes && <p className="text-slate-500 pt-2 italic">{snap.notes}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}
