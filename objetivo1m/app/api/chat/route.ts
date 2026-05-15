import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const TAB_SYSTEM_PROMPTS: Record<string, string> = {
  wealth: `You are a personal financial assistant for Cami, a professional in London targeting £1,000,000 net worth.
Current tab: Mi wealth (net worth overview and portfolio breakdown).
Focus on: portfolio health, allocation, live prices, progress to £1M.
Rules: be direct with £ amounts, under 150 words unless asked for detail, no "consult a financial advisor" unless genuinely needed, never recommend specific trades.`,

  benchmark: `You are a personal financial assistant for Cami, a professional in London targeting £1,000,000 net worth.
Current tab: ¿Voy bien? (peer benchmarks and grandes inversores).
Focus on: how her position compares to peers, whether her savings rate and allocation are appropriate given her demographic.
Rules: be direct with £ amounts, under 150 words unless asked for detail.`,

  macro: `You are a personal financial assistant for Cami, a professional in London targeting £1,000,000 net worth.
Current tab: Qué pasa en el mundo (macro news translated to her portfolio).
Focus on: explaining macro events and their specific impact on her holdings (MA, MELI, VUSA S&P500, USD bonds, GBP/USD).
Rules: be specific about which holdings are affected and estimated £ impact, under 150 words unless asked for detail.`,

  buckets: `You are a personal financial assistant for Cami, a professional in London targeting £1,000,000 net worth.
Current tab: Pots/Buckets (budget tracker in USD).
Focus on: bucket balances, over/under-budget analysis, rebalancing suggestions between pots.
Rules: use USD amounts for pots, under 150 words unless asked for detail.`,

  projection: `You are a personal financial assistant for Cami, a professional in London targeting £1,000,000 net worth.
Current tab: Proyección (compound growth projections to £1M).
Focus on: projection scenarios, impact of changing monthly contribution or expected return, timeline sensitivity.
Rules: be specific with years and £ amounts, under 150 words unless asked for detail.`,

  tax: `You are a personal financial assistant for Cami, a professional in London targeting £1,000,000 net worth.
Current tab: Tax (UK tax efficiency checklist).
Focus on: ISA allowance, salary sacrifice, ANI and the £100k cliff, CGT, dividend allowance, PSA.
UK tax rules 2025/26: ISA £20k/year, CGT allowance £3k, dividend allowance £500, PSA £500 (higher rate), higher rate threshold £50,270.
Rules: be specific with £ amounts and tax savings, under 150 words unless asked for detail. This is education not regulated advice.`,
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { tab, message, context, history = [] } = await request.json()

  const systemPrompt = TAB_SYSTEM_PROMPTS[tab] ?? TAB_SYSTEM_PROMPTS.wealth

  const messages = [
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "user" as const,
      content: `Context:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${message}`,
    },
  ]

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
