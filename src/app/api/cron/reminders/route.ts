import { NextResponse } from "next/server"
import { db } from "~/server/db"
import { sendMail } from "~/lib/mailer"

export const dynamic = "force-dynamic"

/**
 * GET /api/cron/reminders
 *
 * Secured with Authorization: Bearer <CRON_SECRET>.
 * 1. Finds invoices with statusId=2 (čeká) that are past dueDate → sets to 3 (po_splatnosti)
 * 2. For all overdue invoices (statusId=3) that haven't received a reminder today,
 *    sends an email and logs into the Reminder table.
 */
export async function GET(request: Request) {
  // ── Auth check ──────────────────────────────────────────────
  const authHeader = request.headers.get("authorization")
  const expectedToken = process.env.CRON_SECRET

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const flipped = await db.invoice.updateMany({
      where: {
        statusId: 2,
        dueDate: { lt: now },
      },
      data: {
        statusId: 3,
      },
    })

    const overdueInvoices = await db.invoice.findMany({
      where: {
        statusId: 3,
        NOT: {
          reminders: {
            some: {
              date: {
                gte: todayStart,
                lt: todayEnd,
              },
            },
          },
        },
      },
      include: {
        customer: true,
        items: true,
      },
    })

    let sent = 0
    let skipped = 0

    for (const invoice of overdueInvoices) {
      const email = invoice.customer?.contact
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        skipped++
        continue
      }

      const dueFormatted = invoice.dueDate.toLocaleDateString("cs-CZ")
      const totalFormatted = invoice.total.toLocaleString("cs-CZ", {
        minimumFractionDigits: 2,
      })

      const subject = `Upomínka – faktura ${invoice.id} je po splatnosti`
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Upomínka k neuhrazené faktuře</h2>
          <p>Dobrý den,</p>
          <p>dovolujeme si Vás upozornit, že faktura <strong>${invoice.id}</strong> nebyla dosud uhrazena.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Číslo faktury</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${invoice.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Datum splatnosti</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${dueFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Celková částka</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${totalFormatted} Kč</td>
            </tr>
          </table>
          <p>Prosíme o co nejrychlejší úhradu. Pokud jste platbu již odeslali, považujte tento email za bezpředmětný.</p>
          <p>S pozdravem,<br/>Fakturační aplikace</p>
        </div>
      `

      try {
        await sendMail({ to: email, subject, html })

        await db.reminder.create({
          data: {
            invoiceId: invoice.id,
            date: now,
            message: subject,
            status: "sent",
          },
        })

        sent++
      } catch (emailError) {
        console.error(`Failed to send reminder for invoice ${invoice.id}:`, emailError)

        await db.reminder.create({
          data: {
            invoiceId: invoice.id,
            date: now,
            message: subject,
            status: "failed",
          },
        })

        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      flippedToOverdue: flipped.count,
      remindersSent: sent,
      remindersSkipped: skipped,
      totalOverdue: overdueInvoices.length,
    })
  } catch (error) {
    console.error("Cron reminders error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
