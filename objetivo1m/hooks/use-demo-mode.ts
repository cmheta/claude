"use client"

import { useState, useEffect } from "react"

export function useDemoMode() {
  const [demo, setDemo] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDemo(localStorage.getItem("demoMode") === "true")
  }, [])

  function toggle() {
    setDemo((prev) => {
      const next = !prev
      localStorage.setItem("demoMode", String(next))
      return next
    })
  }

  return { demo, toggle, mounted }
}
