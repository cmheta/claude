import Nav from "@/components/layout/nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Nav />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
