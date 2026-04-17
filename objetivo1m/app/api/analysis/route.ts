import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are a personal financial advisor for Cami, a professional in London working toward a £1,000,000 net worth goal. You have deep context on her portfolio.

Her investment philosophy:
- Long-term wealth building (10–20 year horizon)
- Core holdings: Mastercard (MA), MercadoLibre (MELI), and Vanguard S&P 500 (VUSA) via ISA and general account
- Pension maximised through employer (L&G + Vanguard)
- Bonds as a stable allocation (US Treasuries)
- Monthly savings channelled into VUSA or MA

Your analysis should cover:
1. Portfolio health — how is she tracking vs her £1M goal?
2. Allocation assessment — is the current split (stocks/pension/cash/bonds) appropriate?
3. Rebalancing opportunities — anything over or under-weighted?
4. Cashflow efficiency — is her monthly savings rate optimal given her income?
5. One concrete action she should consider this month

Tone: direct, honest, like a smart friend who knows finance. Not overly formal. In English. Be specific with numbers. Don't hedge excessively.

Respond in clear sections with headers. Keep it under 600 words.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const context = await request.json()

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is my current financial data. Please analyse my portfolio:\n\n${JSON.stringify(context, null, 2)}`,
      },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      let fullText = ""
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          fullText += chunk.delta.text
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      // Save analysis to DB
      const snapshotId = context.snapshotId ?? null
      await supabase.from("ai_analyses").insert({
        user_id: user.id,
        snapshot_id: snapshotId,
        prompt_context: context,
        analysis_text: fullText,
      })
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
