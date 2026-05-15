"use client"

import { createContext, useContext } from "react"
import { cn } from "@/lib/utils"

const TabsContext = createContext<{ value: string; onChange: (v: string) => void }>({
  value: "",
  onChange: () => {},
})

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <TabsContext.Provider value={{ value, onChange: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex border-b border-slate-200 overflow-x-auto", className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { value: active, onChange } = useContext(TabsContext)
  return (
    <button
      onClick={() => onChange(value)}
      className={cn(
        "flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors -mb-px border-b-2",
        active === value
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { value: active } = useContext(TabsContext)
  return (
    <div className={cn(active !== value && "hidden", className)}>
      {children}
    </div>
  )
}
