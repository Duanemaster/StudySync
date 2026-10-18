'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { success: boolean; error?: string; data?: any }

const OLLAMA_URL = 'http://localhost:11434'
const OLLAMA_MODEL = 'qwen2.5:7b-instruct'
const MAX_CONTEXT_CHARS = 12000 // ~3k tokens, kasya sa num_ctx below
const OLLAMA_OPTIONS = { num_ctx: 8192, temperature: 0.3 }

// --- Existing Study Session Action ---

export async function logFocusSession(
  taskId: string | null,
  minutes: number
): Promise<ActionResult> {
  const mins = Math.round(minutes)
  if (!Number.isFinite(mins) || mins < 1 || mins > 240) {
    return { success: false, error: 'Invalid minutes.' }
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return { success: false, error: 'Not logged in.' }

  const { error } = await supabase.from('study_sessions').insert({
    user_id: session.user.id,
    task_id: taskId || null,
    minutes: mins,
  })

  if (error) {
    console.error('Focus session insert error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// --- AI & Ollama Actions ---

export async function extractPdfText(formData: FormData): Promise<ActionResult> {
  try {
    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file provided.' }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Requires: npm install pdf-parse@1.1.1
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
    const data = await pdfParse(buffer)

    // Clean up messy whitespace from PDF extraction
    const text = (data.text || '')
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!text) {
      return {
        success: false,
        error: 'No readable text found. Baka scanned/image-only ang PDF.',
      }
    }

    return { success: true, data: text }
  } catch (error: any) {
    console.error('PDF Parse Error:', error)
    return { success: false, error: error.message || 'Failed to parse PDF.' }
  }
}

// Forces Ollama to return exactly this shape (needs Ollama 0.5+)
const FLASHCARD_SCHEMA = {
  type: 'object',
  properties: {
    flashcards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['question', 'answer'],
      },
    },
  },
  required: ['flashcards'],
}

// Handles any shape the model might return
function normalizeFlashcards(parsed: any): { question: string; answer: string }[] {
  let list: any[] = []

  if (Array.isArray(parsed)) {
    list = parsed
  } else if (parsed && typeof parsed === 'object') {
    const arr = Object.values(parsed).find((v) => Array.isArray(v)) as any[] | undefined
    if (arr) list = arr
    else if (parsed.question && parsed.answer) list = [parsed]
    else list = Object.values(parsed).filter((v) => v && typeof v === 'object')
  }

  return list
    .filter((c) => c && typeof c.question === 'string' && typeof c.answer === 'string')
    .map((c) => ({ question: c.question.trim(), answer: c.answer.trim() }))
    .filter((c) => c.question && c.answer)
}

export async function generateFlashcards(
  documentText: string,
  count: number = 8
): Promise<ActionResult> {
  try {
    const safeText = documentText.substring(0, MAX_CONTEXT_CHARS)

    const prompt = `You are a study assistant. Create ${count} flashcards for exam review based ONLY on the document below.

Rules:
- Each flashcard tests ONE key concept, term, definition, fact, or process from the document.
- The question must be clear and self-contained (understandable without seeing the document).
- The answer must be short and accurate (1-3 sentences).
- Do NOT ask questions about the document itself (like "what is this document about").
- Write in the same language as the document.

Document:
"""
${safeText}
"""`

    // Try up to 2 times in case the model returns something unusable
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          format: FLASHCARD_SCHEMA,
          options: OLLAMA_OPTIONS,
        }),
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(`Ollama error (${res.status}). ${detail}`.trim())
      }

      const data = await res.json()
      let cards: { question: string; answer: string }[] = []

      try {
        cards = normalizeFlashcards(JSON.parse(data.response))
      } catch {
        console.error(`Flashcard JSON parse failed (attempt ${attempt}):`, data.response)
      }

      if (cards.length > 0) {
        return {
          success: true,
          data: cards.map((card, index) => ({
            id: index + 1,
            question: card.question,
            answer: card.answer,
          })),
        }
      }

      console.error(`No flashcards (attempt ${attempt}). Raw response:`, data.response)
    }

    throw new Error('Model returned no flashcards. Subukan ulit.')
  } catch (error: any) {
    console.error('Ollama Generation Error:', error)
    return { success: false, error: error.message || 'Failed to generate flashcards.' }
  }
}

export async function chatWithDocument(
  messages: any[],
  documentText: string
): Promise<ActionResult> {
  try {
    const safeText = documentText.substring(0, MAX_CONTEXT_CHARS)

    const systemMessage = {
      role: 'system',
      content: `You are a friendly study assistant helping a student understand a document they uploaded.

Rules:
- Answer using the document below as your main source. If the answer is not in the document, say so honestly, then you may add a brief general explanation and label it clearly as "Hindi ito nasa document".
- Reply in the same language the student uses. If they write in Taglish or Tagalog, reply in natural Taglish.
- If the question is vague (e.g. "ano ang task nito"), interpret it based on the document's main topic and give a helpful answer, or ask one short clarifying question.
- Be clear, accurate, and well-organized. Explain terms simply, with an example when useful.
- Do not make up facts that are not supported by the document.

Formatting rules (use clean Markdown):
- Start summaries with a one-sentence overview, then group the details under short "###" headings.
- Use "-" bullet points for lists and "1." for steps. Put each bullet on its own line.
- Always leave a blank line before and after headings, lists, and paragraphs.
- Use **bold** only for key terms. Keep bullets short (one idea each).
- For simple questions, answer in 1-3 short sentences with no headings.
- End summaries with a "### Key Takeaways" section of 2-4 bullets.

Document:
"""
${safeText}
"""`,
    }

    // Keep only valid chat roles and the last 10 messages to save context
    const history = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .slice(-10)

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [systemMessage, ...history],
        stream: false,
        options: OLLAMA_OPTIONS,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Ollama error (${res.status}). ${detail}`.trim())
    }

    const data = await res.json()
    return { success: true, data: data.message }
  } catch (error: any) {
    console.error('Ollama Chat Error:', error)
    return { success: false, error: error.message || 'Failed to get chat response.' }
  }
}