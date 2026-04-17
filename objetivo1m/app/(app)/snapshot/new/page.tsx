"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { calcNetWorth } from "@/lib/net-worth"
import { formatGBP } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Snapshot } from "@/types/database"

type FormData = Omit<Snapshot, "id" | "user_id" | "created_at">

const DEFAULT_FORM: Partial<FormData> = {
  salary_gbp: 7000,
  total_needs_gbp: 0,
  total_wants_gbp: 0,
  total_pots_usd: 0,
  left_to_save_gbp: 0,
  monthly_contribution_gbp: 500,
  inv_mastercard_shares: 0,
  inv_meli_shares: 0,
  inv_mastercard_gbp: 0,
  inv_meli_gbp: 0,
  inv_vusa_vanguard_gbp: 0,
  inv_vusa_isa_gbp: 0,
  inv_bonds_usd: 0,
  inv_litg_gbp: 0,
  pension_lg_gbp: 0,
  pension_vanguard_gbp: 0,
  savings_marcus_gbp: 0,
  savings_revolut_gbp: 0,
  savings_revolut_usd: 0,
  savings_revolut_eur: 0,
  bonus_gbp: 0,
  ltips_gbp: 0,
  notes: "",
}

export default function NewSnapshotPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState<Partial<FormData>>(DEFAULT_FORM)
  const [prices, setPrices] = useState({ ma: 435, meli: 1580 })
  const [fx, setFx] = useState({ usdToGbp: 0.79, eurToGbp: 0.86 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Fetch prices + last snapshot to pre-fill
    async function init() {
      const [pricesRes, { data: snaps }] = await Promise.all([
        fetch("/api/prices").then((r) => r.json()),
        supabase.from("snapshots").select("*").order("snapshot_date", { ascending: false }).limit(1),
      ])
      if (pricesRes.prices) setPrices(pricesRes.prices)
      if (pricesRes.fx) setFx(pricesRes.fx)
      if (snaps?.[0]) {
        const last = snaps[0] as Snapshot
        setForm((prev) => ({
          ...prev,
          inv_mastercard_shares: last.inv_mastercard_shares,
          inv_meli_shares: last.inv_meli_shares,
          inv_mastercard_gbp: last.inv_mastercard_gbp ?? 0,
          inv_meli_gbp: last.inv_meli_gbp ?? 0,
          inv_vusa_vanguard_gbp: last.inv_vusa_vanguard_gbp,
          inv_vusa_isa_gbp: last.inv_vusa_isa_gbp,
          inv_bonds_usd: last.inv_bonds_usd,
          inv_litg_gbp: last.inv_litg_gbp,
          pension_lg_gbp: last.pension_lg_gbp,
          pension_vanguard_gbp: last.pension_vanguard_gbp,
          savings_marcus_gbp: last.savings_marcus_gbp,
          savings_revolut_gbp: last.savings_revolut_gbp,
          savings_revolut_usd: last.savings_revolut_usd,
          savings_revolut_eur: last.savings_revolut_eur,
          monthly_contribution_gbp: last.monthly_contribution_gbp,
        }))
      }
    }
    init()
  }, [])

  function n(val: unknown): number {
    return Number(val) || 0
  }

  const liveNw = calcNetWorth(
    { ...(form as Snapshot), id: "", user_id: "", created_at: "" },
    prices,
    fx
  )

  const leftToSave =
    n(form.salary_gbp) -
    n(form.total_needs_gbp) -
    n(form.total_wants_gbp) -
    n(form.total_pots_usd) * fx.usdToGbp

  function set(field: keyof FormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Not authenticated"); setLoading(false); return }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const snapshot_date = `${year}-${String(month).padStart(2, "0")}-01`

    const { error: dbError } = await supabase.from("snapshots").upsert(
      {
        user_id: user.id,
        snapshot_date,
        year,
        month,
        ...form,
        left_to_save_gbp: leftToSave,
      },
      { onConflict: "user_id,year,month" }
    )

    if (dbError) { setError(dbError.message); setLoading(false); return }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Nuevo snapshot</h1>
        <div className="text-right">
          <p className="text-xs text-slate-500">Patrimonio en vivo</p>
          <p className="text-xl font-bold text-slate-900">{formatGBP(liveNw.total_gbp)}</p>
        </div>
      </div>

      {/* Cashflow */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Cashflow mensual</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Salario (£)" value={form.salary_gbp} onChange={(v) => set("salary_gbp", v)} />
          <Field label="Gastos necesarios (£)" value={form.total_needs_gbp} onChange={(v) => set("total_needs_gbp", v)} />
          <Field label="Gastos discrecionales (£)" value={form.total_wants_gbp} onChange={(v) => set("total_wants_gbp", v)} />
          <Field label="Pots totales ($)" value={form.total_pots_usd} onChange={(v) => set("total_pots_usd", v)} />
          <div className="col-span-2 border-t pt-3 flex justify-between text-sm">
            <span className="text-slate-500 font-medium">Left to save</span>
            <span className={`font-bold ${leftToSave >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatGBP(leftToSave)}
            </span>
          </div>
          <Field label="Contribución mensual inversión (£)" value={form.monthly_contribution_gbp} onChange={(v) => set("monthly_contribution_gbp", v)} className="col-span-2" />
        </CardContent>
      </Card>

      {/* Investments */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Inversiones</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Mastercard (£)" value={form.inv_mastercard_gbp} onChange={(v) => set("inv_mastercard_gbp", v)} />
          <Field label="MercadoLibre (£)" value={form.inv_meli_gbp} onChange={(v) => set("inv_meli_gbp", v)} />
          <Field label="VUSA Vanguard (£)" value={form.inv_vusa_vanguard_gbp} onChange={(v) => set("inv_vusa_vanguard_gbp", v)} />
          <Field label="VUSA ISA (£)" value={form.inv_vusa_isa_gbp} onChange={(v) => set("inv_vusa_isa_gbp", v)} />
          <Field label="Bonos USD ($)" value={form.inv_bonds_usd} onChange={(v) => set("inv_bonds_usd", v)} />
          <Field label="LITG (£)" value={form.inv_litg_gbp} onChange={(v) => set("inv_litg_gbp", v)} />
        </CardContent>
      </Card>

      {/* Pension */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Pensión</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="L&G (£)" value={form.pension_lg_gbp} onChange={(v) => set("pension_lg_gbp", v)} />
          <Field label="Vanguard pensión (£)" value={form.pension_vanguard_gbp} onChange={(v) => set("pension_vanguard_gbp", v)} />
        </CardContent>
      </Card>

      {/* Savings */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Ahorros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Marcus (£)" value={form.savings_marcus_gbp} onChange={(v) => set("savings_marcus_gbp", v)} />
          <Field label="Revolut (£)" value={form.savings_revolut_gbp} onChange={(v) => set("savings_revolut_gbp", v)} />
          <Field label="Revolut ($)" value={form.savings_revolut_usd} onChange={(v) => set("savings_revolut_usd", v)} />
          <Field label="Revolut (€)" value={form.savings_revolut_eur} onChange={(v) => set("savings_revolut_eur", v)} />
        </CardContent>
      </Card>

      {/* Other */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Otros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Bonus recibido este mes (£)" value={form.bonus_gbp} onChange={(v) => set("bonus_gbp", v)} />
          <Field label="LTIPs (£)" value={form.ltips_gbp} onChange={(v) => set("ltips_gbp", v)} />
          <div className="col-span-2 space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Cualquier nota del mes..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Guardando..." : "Guardar snapshot"}
      </Button>
    </form>
  )
}

function Field({
  label, value, onChange, className,
}: {
  label: string
  value: number | string | null | undefined
  onChange: (v: number) => void
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input
        type="number"
        step="any"
        value={value ?? 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 text-sm"
      />
    </div>
  )
}
