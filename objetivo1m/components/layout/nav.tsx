"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, PlusCircle, PiggyBank, TrendingUp, Brain, History, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/snapshot/new", label: "Nuevo mes", icon: PlusCircle },
  { href: "/buckets", label: "Pots", icon: PiggyBank },
  { href: "/projection", label: "Proyección", icon: TrendingUp },
  { href: "/analysis", label: "Análisis IA", icon: Brain },
  { href: "/history", label: "Historial", icon: History },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen border-r border-slate-200 bg-white px-4 py-6">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">Objetivo 1M</h1>
        <p className="text-xs text-slate-500 mt-0.5">£1,000,000</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Salir
      </button>
    </aside>
  )
}
