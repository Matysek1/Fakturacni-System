import { NextResponse } from "next/server"
import { sendMail } from "~/lib/mailer"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      to: string
      subject: string
      html: string
      pdfBase64: string
      invoiceId: string
    }

    const { to, subject, html, pdfBase64, invoiceId } = body

    if (!to || !subject || !pdfBase64) {
      return NextResponse.json(
        { error: "Chybí povinná pole (to, subject, pdfBase64)" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Neplatný formát emailové adresy" },
        { status: 400 }
      )
    }

    // Decode base64 PDF to Buffer
    const pdfBuffer = Buffer.from(pdfBase64, "base64")

    await sendMail({
      to,
      subject,
      html,
      attachments: [
        {
          filename: `faktura-${invoiceId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to send invoice email:", error)
    return NextResponse.json(
      { error: "Nepodařilo se odeslat email. Zkontrolujte konfiguraci SMTP." },
      { status: 500 }
    )
  }
}
