"use client"

import { useState, useRef, useEffect } from "react"
import { Send, X, Bot, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Message = { role: "user" | "assistant"; content: string }

export function ContextualChat({
  tab,
  context,
  placeholder = "Pregúntame algo...",
}: {
  tab: string
  context: Record<string, unknown>
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: "user", content: text }
    const history = messages.slice(-4)
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setStreaming(true)

    const assistantMsg: Message = { role: "assistant", content: "" }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab, message: text, context, history }),
      })

      if (!res.ok || !res.body) throw new Error("Error")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: "assistant", content: full }
          return updated
        })
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: "assistant", content: "Error connecting to assistant." }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const visibleMessages = messages.slice(-6)

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* Header toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Bot className="w-3.5 h-3.5" /> Asistente IA
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* Messages */}
          {visibleMessages.length > 0 && (
            <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-3">
              {visibleMessages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-xs leading-relaxed",
                    m.role === "user"
                      ? "text-slate-500 text-right"
                      : "text-slate-700"
                  )}
                >
                  {m.role === "assistant" && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 mb-0.5 align-middle" />
                  )}
                  {m.content}
                  {streaming && i === visibleMessages.length - 1 && m.role === "assistant" && (
                    <span className="inline-block w-1 h-3.5 bg-slate-400 animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-100">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-slate-400"
              disabled={streaming}
            />
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Limpiar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={send}
              disabled={!input.trim() || streaming}
              className="text-slate-700 disabled:text-slate-300 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
