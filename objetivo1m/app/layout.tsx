import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Objetivo 1M",
  description: "Personal finance OS — camino al millón",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
