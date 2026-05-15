"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ContextualChat } from "@/components/contextual-chat"
import { formatGBP } from "@/lib/utils"
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react"
import type { Snapshot } from "@/types/database"

// UK tax constants 2025/26
const TAX = {
  ISA_ALLOWANCE: 20_000,
  CGT_ALLOWANCE: 3_000,
  DIVIDEND_ALLOWANCE: 500,
  PSA_HIGHER_RATE: 500,        // £500 for 40% taxpayers
  PERSONAL_ALLOWANCE: 12_570,
  HIGHER_RATE_THRESHOLD: 50_270,
  PA_TAPER_START: 100_000,     // personal allowance starts tapering
  PA_TAPER_END: 125_140,       // personal allowance fully gone
  PENSION_ANNUAL_ALLOWANCE: 60_000,
  ISA_YEAR_START: new Date("2025-04-06"),
  ISA_YEAR_END: new Date("2026-04-05"),
}

type CheckItem = {
  label: string
  status: "ok" | "warn" | "alert" | "info"
  value: string
  detail: string
}

function StatusIcon({ status }: { status: CheckItem["status"] }) {
  if (status === "ok") return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
  if (status === "alert") return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
  return <Info className="w-4 h-4 text-blue-500 shrink-0" />
}

function statusVariant(s: CheckItem["status"]) {
  if (s === "ok") return "success" as const
  if (s === "warn") return "warning" as const
  if (s === "alert") return "destructive" as const
  return "default" as const
}

export function TabTax({ snapshot }: { snapshot: Snapshot }) {
  const annualSalary = snapshot.salary_gbp * 12

  // ISA: estimate months since April 6
  const now = new Date()
  const taxYearStart = new Date(now.getFullYear(), 3, 6) // April 6 this year
  if (now < taxYearStart) taxYearStart.setFullYear(taxYearStart.getFullYear() - 1)
  const daysInYear = 365
  const daysElapsed = Math.floor((now.getTime() - taxYearStart.getTime()) / (1000 * 60 * 60 * 24))
  const monthsElapsed = Math.floor(daysElapsed / 30.4)
  const daysToYearEnd = daysInYear - daysElapsed

  // We can estimate monthly ISA contribution from monthly_contribution_gbp
  // Half goes to ISA (assumption based on her setup)
  const estimatedIsaContrib = Math.round(snapshot.monthly_contribution_gbp * 0.5 * monthsElapsed)
  const isaRemaining = Math.max(TAX.ISA_ALLOWANCE - estimatedIsaContrib, 0)

  // ANI estimate (simplified)
  const ani = annualSalary  // No salary sacrifice data in schema — use gross salary
  const aniToTaper = Math.max(TAX.PA_TAPER_START - ani, 0)

  // Marcus interest (estimated at 4.5% AER — UK savings rate 2025)
  const marcusInterestRate = 0.045
  const estimatedMarcusInterest = snapshot.savings_marcus_gbp * marcusInterestRate
  const psaExcess = Math.max(estimatedMarcusInterest - TAX.PSA_HIGHER_RATE, 0)
  const psaTaxLiability = Math.round(psaExcess * 0.40)

  // Tax saving from ISA vs taxable account (40% tax on gains/interest)
  const isaValue = snapshot.inv_vusa_isa_gbp
  const estimatedIsaGainProtected = Math.round(isaValue * 0.08) // rough 8% annual gain
  const isaTaxSaving = Math.round(estimatedIsaGainProtected * 0.40)

  const checks: CheckItem[] = [
    {
      label: "ISA allowance",
      status: isaRemaining < 5_000 && daysToYearEnd > 90 ? "warn" : isaRemaining < 2_000 ? "alert" : "ok",
      value: `£${isaRemaining.toLocaleString()} restante`,
      detail: `Allowance anual: £20,000. Contribuciones estimadas este año fiscal: £${estimatedIsaContrib.toLocaleString()}. Tu ISA vale £${snapshot.inv_vusa_isa_gbp.toLocaleString()} — protege ~£${isaTaxSaving.toLocaleString()} en impuestos por año.`,
    },
    {
      label: "ANI vs £100k cliff",
      status: ani >= 95_000 ? "alert" : ani >= 85_000 ? "warn" : "ok",
      value: `ANI est. £${annualSalary.toLocaleString()}`,
      detail: ani >= TAX.PA_TAPER_START
        ? `Tu ANI estimado supera £100k — pierdes £1 de personal allowance por cada £2 sobre £100k. Considera salary sacrifice o SIPP contributions para reducirlo.`
        : `£${aniToTaper.toLocaleString()} por debajo del cliff de £100k. Mantener salario sacrifice si tienes.`,
    },
    {
      label: "Personal Savings Allowance",
      status: psaExcess > 0 ? "warn" : "ok",
      value: `Interés Marcus est. £${estimatedMarcusInterest.toFixed(0)}`,
      detail: psaExcess > 0
        ? `Interés estimado (4.5% AER): £${estimatedMarcusInterest.toFixed(0)} → £${psaExcess.toFixed(0)} sobre el PSA de £500 → ~£${psaTaxLiability} de tax liability. Considera mover parte de Marcus al ISA.`
        : `Interés estimado de Marcus (4.5% AER): £${estimatedMarcusInterest.toFixed(0)} — dentro del PSA de £500.`,
    },
    {
      label: "CGT allowance",
      status: "info",
      value: `£${TAX.CGT_ALLOWANCE.toLocaleString()} disponible`,
      detail: `Allowance anual: £3,000. No registramos ventas o cost basis — revisa con tu broker si has cristalizado ganancias este año fiscal. Si tienes pérdidas unrealised, considera crystallising antes de April 5.`,
    },
    {
      label: "Dividend allowance",
      status: "info",
      value: `£${TAX.DIVIDEND_ALLOWANCE} disponible`,
      detail: `Allowance anual: £500 (2025/26). MA y MELI pueden pagar dividendos — si están fuera del ISA revisa si superan £500. VUSA en ISA no cuenta.`,
    },
    {
      label: "Pensión / salary sacrifice",
      status: "info",
      value: `Pensión: £${(snapshot.pension_lg_gbp + snapshot.pension_vanguard_gbp).toLocaleString()}`,
      detail: `Annual allowance: £60,000. Contribuciones via L&G y Vanguard SIPP reducen tu ANI. No tenemos datos de salary sacrifice % — revisa payslip para confirmar rate.`,
    },
  ]

  const chatContext = {
    annualSalary,
    ani,
    isaRemaining,
    marcusInterest: Math.round(estimatedMarcusInterest),
    psaTaxLiability,
    isaValue: snapshot.inv_vusa_isa_gbp,
    pension: snapshot.pension_lg_gbp + snapshot.pension_vanguard_gbp,
    taxYear: "2025/26",
  }

  const alertCount = checks.filter((c) => c.status === "alert").length
  const warnCount = checks.filter((c) => c.status === "warn").length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tax Efficiency</h2>
          <p className="text-sm text-slate-500 mt-0.5">UK tax year 2025/26 · Basado en tu snapshot</p>
        </div>
        <div className="flex gap-2">
          {alertCount > 0 && <Badge variant="destructive">{alertCount} alerta{alertCount > 1 ? "s" : ""}</Badge>}
          {warnCount > 0 && <Badge variant="warning">{warnCount} aviso{warnCount > 1 ? "s" : ""}</Badge>}
          {alertCount === 0 && warnCount === 0 && <Badge variant="success">Todo OK</Badge>}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Salario bruto anual</p>
          <p className="text-sm font-bold">{formatGBP(annualSalary)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Tax bracket</p>
          <p className="text-sm font-bold">{ani > TAX.HIGHER_RATE_THRESHOLD ? "40%" : "20%"}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">ISA restante</p>
          <p className="text-sm font-bold">{formatGBP(isaRemaining)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">PSA tax est.</p>
          <p className={`text-sm font-bold ${psaTaxLiability > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {psaTaxLiability > 0 ? `−${formatGBP(psaTaxLiability)}` : "£0"}
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {checks.map((item) => (
          <Card key={item.label}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <StatusIcon status={item.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">{item.value}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Estimaciones basadas en tu snapshot. Reglas fiscales UK 2025/26. Esto es educación financiera, no asesoramiento regulado.
      </p>

      <ContextualChat
        tab="tax"
        context={chatContext}
        placeholder="¿Cuánto me ahorro si muevo £8k de Marcus al ISA?"
      />
    </div>
  )
}
