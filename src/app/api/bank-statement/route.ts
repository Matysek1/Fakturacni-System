import { NextResponse } from "next/server"
import { auth } from "~/server/auth"
import { db } from "~/server/db"
import OpenAI from "openai"

interface ParsedTransaction {
  vs: string
  amount: number
  date: string
  description: string
}

interface MatchResult {
  invoiceId: string
  vs: string
  parsedAmount: number
  invoiceTotal: number
  status: "matched" | "amount_mismatch" | "not_found" | "already_paid"
  message: string
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Send the PDF to OpenAI and extract structured transaction data.
 * Uses GPT-4o with file input to parse any Czech bank statement format.
 */
async function extractTransactionsWithAI(
  pdfBase64: string,
  bankAccount: string | null,
  bankCode: string | null
): Promise<{
  transactions: ParsedTransaction[]
  accountVerified: boolean
  accountMessage: string
}> {
  const accountInfo = bankAccount
    ? `${bankAccount}${bankCode ? "/" + bankCode : ""}`
    : null

  const systemPrompt = `Jsi expert na čtení českých bankovních výpisů z PDF souborů. Tvým úkolem je ze souboru extrahovat příchozí platby (kreditní transakce) a ověřit číslo účtu.

Vrať výsledek POUZE jako validní JSON objekt (žádný markdown, žádné komentáře) v tomto formátu:
{
  "accountVerified": true/false,
  "accountMessage": "zpráva o ověření účtu",
  "transactions": [
    {
      "vs": "variabilní symbol (pouze čísla, bez prefixu VS)",
      "amount": 1234.56,
      "date": "DD.MM.YYYY",
      "description": "stručný popis transakce"
    }
  ]
}

Pravidla:
- Extrahuj POUZE příchozí platby (kreditní/kladné transakce). IGNORUJ odchozí platby (debetní/záporné).
- Variabilní symbol (VS) je vždy číslo. Může být ve formátu "VS: 123456", "VS20250007", "/VS/123", "Variabilní symbol: 123".
- Pokud transakce nemá variabilní symbol, PŘESKOČ ji.
- Částky jsou v českém formátu (např. "24 500,00" = 24500.00). Převeď je na desetinné číslo.
- Datum převeď do formátu DD.MM.YYYY.
${accountInfo ? `- Ověř, zda se ve výpisu nachází číslo účtu "${accountInfo}" (naší firmy). Pokud ano, nastav accountVerified na true.` : "- Číslo účtu k ověření nebylo poskytnuto, nastav accountVerified na false s odpovídající zprávou."}`

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "file",
            file: {
              filename: "bank_statement.pdf",
              file_data: `data:application/pdf;base64,${pdfBase64}`,
            },
          },
          {
            type: "text",
            text: "Extrahuj příchozí transakce s variabilním symbolem z tohoto bankovního výpisu.",
          },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 4096,
  })

  const content = response.choices[0]?.message?.content ?? ""

  // Clean potential markdown code fences from the response
  const jsonStr = content
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim()

  try {
    const parsed = JSON.parse(jsonStr) as {
      accountVerified?: boolean
      accountMessage?: string
      transactions?: Array<{
        vs?: string
        amount?: number
        date?: string
        description?: string
      }>
    }

    const transactions: ParsedTransaction[] = (parsed.transactions ?? [])
      .filter(
        (t): t is { vs: string; amount: number; date: string; description: string } =>
          typeof t.vs === "string" &&
          t.vs.length > 0 &&
          typeof t.amount === "number" &&
          t.amount > 0
      )
      .map((t) => ({
        vs: t.vs.replace(/^0+/, "") || t.vs,   // strip leading zeros but keep at least one char
        amount: t.amount,
        date: t.date ?? "",
        description: t.description ?? "",
      }))

    return {
      transactions,
      accountVerified: parsed.accountVerified ?? false,
      accountMessage: parsed.accountMessage ?? "Ověření účtu nebylo provedeno.",
    }
  } catch {
    console.error("Failed to parse OpenAI response:", jsonStr)
    throw new Error("OpenAI vrátilo nevalidní JSON odpověď.")
  }
}

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

    if (file?.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Nahrajte platný PDF soubor." },
        { status: 400 }
      )
    }

    // Convert PDF to base64
    const buffer = await file.arrayBuffer()
    const pdfBase64 = Buffer.from(buffer).toString("base64")

    // Get company info for account verification
    const company = await db.company.findFirst({
      select: { bankAccount: true, bankCode: true },
    })

    // Extract transactions using OpenAI
    const { transactions, accountVerified, accountMessage } =
      await extractTransactionsWithAI(
        pdfBase64,
        company?.bankAccount ?? null,
        company?.bankCode ?? null
      )

    const accountVerification = {
      verified: accountVerified,
      message: accountMessage,
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        accountVerification,
        results: [],
        summary: {
          total: 0,
          matched: 0,
          mismatched: 0,
          notFound: 0,
          alreadyPaid: 0,
        },
        message:
          "Nebyly nalezeny žádné transakce s variabilním symbolem ve výpisu.",
      })
    }

    // Match transactions to invoices
    const results: MatchResult[] = []

    for (const tx of transactions) {
      // Find invoice by VS (invoice ID)
      const invoice = await db.invoice.findUnique({
        where: { id: tx.vs },
        select: {
          id: true,
          total: true,
          statusId: true,
          status: { select: { name: true } },
        },
      })

      if (!invoice) {
        results.push({
          invoiceId: tx.vs,
          vs: tx.vs,
          parsedAmount: tx.amount,
          invoiceTotal: 0,
          status: "not_found",
          message: `Faktura s VS ${tx.vs} nebyla nalezena.`,
        })
        continue
      }

      // Check if already paid
      if (invoice.status.name === "zaplacena") {
        results.push({
          invoiceId: invoice.id,
          vs: tx.vs,
          parsedAmount: tx.amount,
          invoiceTotal: invoice.total,
          status: "already_paid",
          message: `Faktura ${invoice.id} je již zaplacena.`,
        })
        continue
      }

      // Compare amounts (with small tolerance for rounding)
      const amountDiff = Math.abs(invoice.total - tx.amount)
      const tolerance = 0.5 // 0.50 CZK tolerance

      if (amountDiff <= tolerance) {
        // Match! Mark as paid
        // statusId 4 = zaplacena
        await db.invoice.update({
          where: { id: invoice.id },
          data: { statusId: 4 },
        })

        // Create payment record
        await db.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: tx.amount,
            date: new Date(),
            method: "bankovní převod",
            vs: tx.vs,
          },
        })

        results.push({
          invoiceId: invoice.id,
          vs: tx.vs,
          parsedAmount: tx.amount,
          invoiceTotal: invoice.total,
          status: "matched",
          message: `Faktura ${invoice.id} označena jako zaplacená.`,
        })
      } else {
        results.push({
          invoiceId: invoice.id,
          vs: tx.vs,
          parsedAmount: tx.amount,
          invoiceTotal: invoice.total,
          status: "amount_mismatch",
          message: `Částka nesedí: výpis ${tx.amount.toFixed(2)} Kč vs. faktura ${invoice.total.toFixed(2)} Kč.`,
        })
      }
    }

    const summary = {
      total: results.length,
      matched: results.filter((r) => r.status === "matched").length,
      mismatched: results.filter((r) => r.status === "amount_mismatch").length,
      notFound: results.filter((r) => r.status === "not_found").length,
      alreadyPaid: results.filter((r) => r.status === "already_paid").length,
    }

    return NextResponse.json({
      accountVerification,
      results,
      summary,
      message: `Zpracováno ${summary.total} transakcí: ${summary.matched} spárováno, ${summary.mismatched} nesedí částka, ${summary.notFound} nenalezeno.`,
    })
  } catch (error) {
    console.error("Bank statement processing error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Chyba při zpracování výpisu."
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
