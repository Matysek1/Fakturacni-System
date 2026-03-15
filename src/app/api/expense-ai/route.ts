import { NextResponse } from "next/server"
import { auth } from "~/server/auth"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})


export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Neautorizováno" }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API klíč není nastaven. Přidejte OPENAI_API_KEY do .env souboru." },
      { status: 500 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "Nahrajte soubor." },
        { status: 400 }
      )
    }

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Podporované formáty: PDF, PNG, JPEG, WebP, GIF." },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")

    const isPdf = file.type === "application/pdf"
    const mimeType = file.type

    const systemPrompt = `Jsi expert na čtení českých faktur (nákladových faktur / přijatých faktur). Tvým úkolem je ze souboru extrahovat veškerá data faktury.

Vrať výsledek POUZE jako validní JSON objekt (žádný markdown, žádné komentáře) v tomto formátu:
{
  "supplier": {
    "name": "název dodavatele",
    "ico": "IČO dodavatele nebo null",
    "dic": "DIČ dodavatele nebo null",
    "address": "adresa dodavatele nebo null"
  },
  "invoiceNumber": "číslo faktury z dokumentu nebo null",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "description": "stručný popis faktury (jedna věta)",
  "items": [
    {
      "description": "popis položky",
      "qty": 1,
      "unit": "ks",
      "price": 1000.00,
      "vat": 21
    }
  ],
  "totalWithoutVat": 1000.00,
  "totalVat": 210.00,
  "total": 1210.00
}

Pravidla:
- Extrahuj VŠECHNY položky faktury. Pokud faktura nemá položky, vytvoř jednu souhrnnou s celkovou částkou.
- Částky převeď na čísla (např. "1 234,56 Kč" → 1234.56).
- Sazbu DPH uveď jako celé číslo (0, 12, nebo 21).
- Jednotku (unit) se pokus rozpoznat, jinak použij "ks".
- Data převeď do formátu YYYY-MM-DD.
- Pokud datum splatnosti není uvedeno, použij datum vystavení + 14 dní.
- Popis by měl stručně shrnout, o co se jedná (např. "Pronájem kanceláře leden 2026").`

    // Build the user message content based on file type
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = isPdf
      ? [
          {
            type: "file" as const,
            file: {
              filename: file.name || "invoice.pdf",
              file_data: `data:application/pdf;base64,${base64}`,
            },
          },
          {
            type: "text" as const,
            text: "Extrahuj data z této nákladové faktury.",
          },
        ]
      : [
          {
            type: "image_url" as const,
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
            },
          },
          {
            type: "text" as const,
            text: "Extrahuj data z této nákladové faktury.",
          },
        ]

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0,
      max_tokens: 4096,
    })

    const content = response.choices[0]?.message?.content ?? ""

    // Clean potential markdown code fences
    const jsonStr = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim()

    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>

      return NextResponse.json({
        success: true,
        data: parsed,
      })
    } catch {
      console.error("Failed to parse OpenAI response:", jsonStr)
      return NextResponse.json(
        { error: "AI vrátila nevalidní odpověď. Zkuste to prosím znovu." },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("AI expense extraction error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Chyba při zpracování souboru."
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
