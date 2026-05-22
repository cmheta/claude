"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, PlusCircle, History, LogOut, FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useDemoMode } from "@/hooks/use-demo-mode"

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/snapshot/new", label: "Nuevo mes", icon: PlusCircle },
  { href: "/history", label: "Historial", icon: History },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { demo, toggle, mounted } = useDemoMode()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-52 min-h-screen border-r border-slate-200 bg-white px-4 py-6">
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

      {/* Demo mode toggle */}
      {mounted && (
        <button
          onClick={toggle}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
            demo
              ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          )}
        >
          <FlaskConical className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Demo</span>
          <span className={cn(
            "w-8 h-4 rounded-full relative transition-colors",
            demo ? "bg-violet-500" : "bg-slate-300"
          )}>
            <span className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
              demo ? "translate-x-4" : "translate-x-0.5"
            )} />
          </span>
        </button>
      )}

      {demo && (
        <p className="text-xs text-violet-600 px-3 pb-2 font-medium">Sofia Reyes</p>
      )}

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
