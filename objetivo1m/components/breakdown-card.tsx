"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { formatGBP } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"

type Line = { label: string; value: number }

export function BreakdownCard({
  label,
  value,
  desc,
  lines,
}: {
  label: string
  value: number
  desc: string
  lines: Line[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Card
      className="cursor-pointer hover:border-slate-400 transition-colors"
      onClick={() => setOpen((o) => !o)}
    >
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-slate-900">{formatGBP(value)}</p>
            <p className="text-xs text-slate-400 mt-1">{desc}</p>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          )}
        </div>

        {open && (
          <div className="mt-3 pt-3 border-t space-y-1.5" onClick={(e) => e.stopPropagation()}>
            {lines.filter((l) => l.value !== 0).map((l) => (
              <div key={l.label} className="flex justify-between text-xs">
                <span className="text-slate-500">{l.label}</span>
                <span className={`font-medium ${l.value < 0 ? "text-red-500" : "text-slate-700"}`}>
                  {l.value < 0 ? `− ${formatGBP(Math.abs(l.value))}` : formatGBP(l.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
