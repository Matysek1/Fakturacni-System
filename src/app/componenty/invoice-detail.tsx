"use client"
 

import { useRef, useState, useEffect } from "react"
import QRCode from "qrcode"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Card } from "~/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import {
  ArrowLeft,
  Download,
  Send,
  Printer,
  Copy,
  Pencil,
  MoreHorizontal,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import Link from "next/link"
import { api } from "~/trpc/react"
import { toast } from "sonner"

interface InvoiceDetailProps {
  invoiceId: string
}


const paymentMethodLabels: Record<string, string> = {
  bank: "Bankovní převod",
  card: "Kartou",
  cash: "Hotově",
  cod: "Dobírka",
  other: "Jiná",
}

const statusOptions = [
  { id: 1, name: "koncept", label: "Koncept" },
  { id: 2, name: "ceka", label: "Čeká" },
  { id: 3, name: "po_splatnosti", label: "Po splatnosti" },
  { id: 4, name: "zaplacena", label: "Zaplacena" },
]

/**
 * Convert Czech domestic bank account (prefix-number/bankCode) to IBAN.
 * Czech IBAN: CZ + 2 check digits + 4-digit bank code + 6-digit prefix (zero-padded) + 10-digit account (zero-padded)
 */
function czechAccountToIBAN(bankAccount: string, bankCode: string): string {
  // Parse prefix and account number
  let prefix = "0"
  let accountNum = bankAccount.replace(/\s/g, "")

  if (accountNum.includes("-")) {
    const parts = accountNum.split("-")
    prefix = parts[0] ?? "0"
    accountNum = parts[1] ?? accountNum
  }

  const paddedBank = bankCode.padStart(4, "0")
  const paddedPrefix = prefix.padStart(6, "0")
  const paddedAccount = accountNum.padStart(10, "0")

  // BBAN = bankCode(4) + prefix(6) + account(10)
  const bban = paddedBank + paddedPrefix + paddedAccount

  // Check digits: move CZ00 to end as numeric (C=12, Z=35, 00)
  // Then compute 98 - (number mod 97)
  const numericStr = bban + "123500"
  // Use BigInt for mod 97 on large numbers
  const remainder = BigInt(numericStr) % 97n
  const checkDigits = String(98n - remainder).padStart(2, "0")

  return `CZ${checkDigits}${bban}`
}

/**
 * Generate Czech SPAYD (Short Payment Descriptor) string for QR payment.
 */
function generateSPAYD(opts: {
  iban: string
  amount: number
  currency?: string
  vs?: string
  dueDate?: Date | string
  message?: string
}): string {
  const parts = ["SPD*1.0"]
  parts.push(`ACC:${opts.iban}`)
  parts.push(`AM:${opts.amount.toFixed(2)}`)
  parts.push(`CC:${opts.currency ?? "CZK"}`)
  if (opts.vs) parts.push(`VS:${opts.vs}`)
  if (opts.dueDate) {
    const d = new Date(opts.dueDate)
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
    parts.push(`DT:${dateStr}`)
  }
  if (opts.message) parts.push(`MSG:${opts.message.substring(0, 60)}`)
  return parts.join("*")
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const { data: invoice, isLoading, error } = api.invoice.getById.useQuery({ id: invoiceId })
  const { data: company } = api.company.get.useQuery()
  const utils = api.useUtils()
  const updateStatusMutation = api.invoice.updateStatus.useMutation({
    onMutate: async ({ statusId }) => {
      // Cancel outgoing refetches
      await utils.invoice.getById.cancel({ id: invoiceId })

      // Snapshot current data
      const previousData = utils.invoice.getById.getData({ id: invoiceId })

      // Optimistically update
      const newStatus = statusOptions.find((s) => s.id === statusId)
      if (previousData && newStatus) {
        utils.invoice.getById.setData({ id: invoiceId }, {
          ...previousData,
          statusId,
          status: { id: statusId, name: newStatus.name, label: newStatus.label },
        })
      }

      return { previousData }
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        utils.invoice.getById.setData({ id: invoiceId }, context.previousData)
      }
    },
    onSettled: () => {
      void utils.invoice.getById.invalidate({ id: invoiceId })
      void utils.invoice.get.invalidate()
    },
  })
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailTo, setEmailTo] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [emailStep, setEmailStep] = useState<"form" | "confirm" | "sending" | "success" | "error">("form")
  const [emailError, setEmailError] = useState("")

  // ── Compute QR payment code ──────────────────────────────
  // Must be called unconditionally (React hooks rule)
  useEffect(() => {
    if (!invoice || !company?.bankAccount || !company?.bankCode) {
      setQrDataUrl("")
      return
    }

    const iban = company.iban ?? (company.bankAccount && company.bankCode ? czechAccountToIBAN(company.bankAccount, company.bankCode) : "")
    if (!iban) return

    // Calculate total
    const calcTotal = (item: { qty: number; price: number; vat: number | null }) =>
      item.qty * item.price * (1 + (item.vat ?? 0) / 100)
    const invoiceTotal = invoice.items.reduce(
      (sum: number, item: { qty: number; price: number; vat: number | null }) => sum + calcTotal(item),
      0
    )

    const variableSymbol = invoice.payments?.[0]?.vs ?? invoice.id.replace(/\D/g, "")
    const vs = variableSymbol

    const spayd = generateSPAYD({
      iban,
      amount: invoiceTotal,
      vs,
      dueDate: invoice.dueDate,
      message: `Faktura ${invoice.id}`,
    })

    QRCode.toDataURL(spayd, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url: string) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""))
  }, [invoice, company])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("cs-CZ")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-muted-foreground">{error?.message ?? "Faktura nenalezena"}</p>
        <Button variant="outline" asChild>
          <Link href="/faktury">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na seznam
          </Link>
        </Button>
      </div>
    )
  }

  const currentStatusName = invoice.status.name
  const isDraft = currentStatusName === "koncept"

  // Calculate item totals
  const calculateItemTotal = (item: { qty: number; price: number }) => {
    return item.qty * item.price
  }

  const calculateItemVat = (item: { qty: number; price: number; vat: number | null }) => {
    return calculateItemTotal(item) * ((item.vat ?? 0) / 100)
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  const totalVat = invoice.items.reduce((sum, item) => sum + calculateItemVat(item), 0)
  const total = subtotal + totalVat

  const vatSummary = invoice.items.reduce((acc, item) => {
    const rate = item.vat ?? 0
    acc[rate] ??= { base: 0, vat: 0 }
    acc[rate].base += calculateItemTotal(item)
    acc[rate].vat += calculateItemVat(item)
    return acc
  }, {} as Record<number, { base: number; vat: number }>)

  // Supplier data from company
  const supplier = company ? {
    name: company.name,
    street: company.address ?? "",
    city: company.mesto ?? "",
    zip: company.psc ?? "",
    ico: company.ico ?? "",
    dic: company.dic ?? "",
    bankAccount: company.bankAccount ?? "",
    bankCode: company.bankCode ?? "",
  } : {
    name: "—", street: "", city: "", zip: "", ico: "", dic: "",
    bankAccount: "", bankCode: "",
  }

  // Customer data from invoice relation
  const customer = {
    name: invoice.customer.name,
    street: invoice.customer.address ?? "",
    city: invoice.customer.mesto ?? "",
    zip: invoice.customer.psc ?? "",
    ico: invoice.customer.ico ?? "",
    dic: invoice.customer.dic ?? "",
  }

  const paymentMethod = invoice.payments?.[0]?.method ?? "bank"
  const variableSymbol = invoice.payments?.[0]?.vs ?? invoice.id.replace(/\D/g, "")
  const iban = company?.iban ?? (supplier.bankAccount && supplier.bankCode
    ? czechAccountToIBAN(supplier.bankAccount, supplier.bankCode)
    : "")

  const spaydString = iban
    ? generateSPAYD({
        iban,
        amount: total,
        vs: variableSymbol,
        dueDate: invoice.dueDate,
        message: `Faktura ${invoice.id}`,
      })
    : ""

  const getStatusBadge = (statusName: string) => {
    switch (statusName) {
      case "zaplacena":
        return (
          <Badge className="bg-green-500/10 text-green-500 text-xs gap-1">
            <CheckCircle className="h-3 w-3" />
            Zaplacena
          </Badge>
        )
      case "ceka":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 text-xs gap-1">
            <Clock className="h-3 w-3" />
            Čeká
          </Badge>
        )
      case "po_splatnosti":
        return (
          <Badge className="bg-red-500/10 text-red-500 text-xs gap-1">
            <AlertCircle className="h-3 w-3" />
            Po splatnosti
          </Badge>
        )
      case "koncept":
        return (
          <Badge className="bg-muted text-muted-foreground text-xs gap-1">
            <FileText className="h-3 w-3" />
            Koncept
          </Badge>
        )
      default:
        return <Badge>{statusName}</Badge>
    }
  }

  const handleStatusChange = (statusId: number) => {
    updateStatusMutation.mutate({ id: invoiceId, statusId })
  }

  const handlePrint = () => {
    window.print()
  }

  const generatePDFDocument = async () => {
    const { jsPDF } = await import("jspdf")

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageWidth = 210
    const margin = 15
    const contentWidth = pageWidth - margin * 2
    let y = margin

    // ── Load & register Roboto font for Czech diacritics ────
    const loadFont = async (url: string) => {
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ""
      for (const byte of bytes) {
        binary += String.fromCharCode(byte)
      }
      return btoa(binary)
    }

    try {
      const [regularB64, boldB64] = await Promise.all([
        loadFont("/fonts/Roboto-Regular.ttf"),
        loadFont("/fonts/Roboto-Bold.ttf"),
      ])

      pdf.addFileToVFS("Roboto-Regular.ttf", regularB64)
      pdf.addFont("Roboto-Regular.ttf", "Roboto", "normal")
      pdf.addFileToVFS("Roboto-Bold.ttf", boldB64)
      pdf.addFont("Roboto-Bold.ttf", "Roboto", "bold")
      pdf.setFont("Roboto", "normal")
    } catch {
      // Fallback to helvetica if fonts fail to load
      pdf.setFont("helvetica", "normal")
    }

    const fontName = pdf.getFont().fontName === "Roboto" ? "Roboto" : "helvetica"

    // Helper functions
    const setColor = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      pdf.setTextColor(r, g, b)
    }

    const setDrawColor = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      pdf.setDrawColor(r, g, b)
    }

    const setFillColor = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      pdf.setFillColor(r, g, b)
    }

    const fmtCurrency = (amount: number) =>
      new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", minimumFractionDigits: 2 }).format(amount)

    const fmtDate = (d: Date | string) =>
      new Date(d).toLocaleDateString("cs-CZ")

    // ── Header ──────────────────────────────────────────────
    setColor("#6b7280")
    pdf.setFontSize(8)
    pdf.text("DODAVATEL", margin, y)
    pdf.text("FAKTURA", pageWidth - margin, y, { align: "right" })

    y += 5
    setColor("#111827")
    pdf.setFontSize(12)
    pdf.setFont(fontName, "bold")
    pdf.text(supplier.name, margin, y)

    setColor("#2563eb")
    pdf.setFontSize(18)
    pdf.text(invoice.id, pageWidth - margin, y, { align: "right" })

    y += 5
    setDrawColor("#e5e7eb")
    pdf.setLineWidth(0.3)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 8

    // ── Supplier & Customer boxes ───────────────────────────
    const boxWidth = (contentWidth - 6) / 2
    const boxStartY = y

    // Supplier box
    setFillColor("#f9fafb")
    pdf.setDrawColor(240, 240, 240)
    pdf.roundedRect(margin, y, boxWidth, 38, 2, 2, "F")

    let bx = margin + 4
    let by = y + 5
    setColor("#6b7280")
    pdf.setFontSize(7)
    pdf.setFont(fontName, "normal")
    pdf.text("DODAVATEL", bx, by)

    by += 5
    setColor("#111827")
    pdf.setFontSize(9)
    pdf.setFont(fontName, "bold")
    pdf.text(supplier.name, bx, by)

    by += 4
    pdf.setFont(fontName, "normal")
    setColor("#4b5563")
    pdf.setFontSize(8)
    pdf.text(supplier.street, bx, by)
    by += 3.5
    pdf.text(`${supplier.zip} ${supplier.city}`, bx, by)

    by += 6
    setDrawColor("#e5e7eb")
    pdf.line(bx, by - 2, bx + boxWidth - 8, by - 2)
    setColor("#6b7280")
    pdf.setFontSize(7.5)
    pdf.text("IČO: ", bx, by)
    setColor("#111827")
    pdf.setFont(fontName, "bold")
    pdf.text(supplier.ico, bx + 8, by)
    pdf.setFont(fontName, "normal")
    setColor("#6b7280")
    pdf.text("  |  DIČ: ", bx + 22, by)
    setColor("#111827")
    pdf.setFont(fontName, "bold")
    pdf.text(supplier.dic, bx + 36, by)

    // Customer box
    const cx = margin + boxWidth + 6
    setFillColor("#f9fafb")
    pdf.roundedRect(cx, boxStartY, boxWidth, 38, 2, 2, "F")

    bx = cx + 4
    by = boxStartY + 5
    setColor("#6b7280")
    pdf.setFontSize(7)
    pdf.setFont(fontName, "normal")
    pdf.text("ODBĚRATEL", bx, by)

    by += 5
    setColor("#111827")
    pdf.setFontSize(9)
    pdf.setFont(fontName, "bold")
    pdf.text(customer.name, bx, by)

    by += 4
    pdf.setFont(fontName, "normal")
    setColor("#4b5563")
    pdf.setFontSize(8)
    pdf.text(customer.street, bx, by)
    by += 3.5
    pdf.text(`${customer.zip} ${customer.city}`, bx, by)

    by += 6
    setDrawColor("#e5e7eb")
    pdf.line(bx, by - 2, bx + boxWidth - 8, by - 2)
    setColor("#6b7280")
    pdf.setFontSize(7.5)
    pdf.text("IČO: ", bx, by)
    setColor("#111827")
    pdf.setFont(fontName, "bold")
    pdf.text(customer.ico, bx + 8, by)
    if (customer.dic) {
      pdf.setFont(fontName, "normal")
      setColor("#6b7280")
      pdf.text("  |  DIČ: ", bx + 22, by)
      setColor("#111827")
      pdf.setFont(fontName, "bold")
      pdf.text(customer.dic, bx + 36, by)
    }

    y = boxStartY + 38 + 8

    // ── Payment Info ────────────────────────────────────────
    const cols = [
      { label: "Datum vystavení", value: fmtDate(invoice.issueDate) },
      { label: "DUZP", value: fmtDate(invoice.duzpDate) },
      { label: "Datum splatnosti", value: fmtDate(invoice.dueDate) },
      { label: "Způsob platby", value: paymentMethodLabels[paymentMethod] ?? paymentMethod },
      { label: "Variabilní symbol", value: variableSymbol },
    ]
    const colWidth = contentWidth / 5
    cols.forEach((col, i) => {
      const colX = margin + i * colWidth
      setColor("#6b7280")
      pdf.setFontSize(7.5)
      pdf.setFont(fontName, "normal")
      pdf.text(col.label, colX, y)
      setColor("#111827")
      pdf.setFontSize(9)
      pdf.setFont(fontName, "bold")
      pdf.text(col.value, colX, y + 4)
    })

    y += 12

    // ── Bank Account ────────────────────────────────────────
    setFillColor("#eff6ff")
    pdf.roundedRect(margin, y, contentWidth, 14, 2, 2, "F")
    setColor("#1d4ed8")
    pdf.setFontSize(7.5)
    pdf.setFont(fontName, "normal")
    pdf.text("Bankovní spojení", margin + 4, y + 5)
    setColor("#1e40af")
    pdf.setFontSize(11)
    pdf.setFont(fontName, "bold")
    pdf.text(`${supplier.bankAccount}/${supplier.bankCode}`, margin + 4, y + 11)

    y += 20

    // ── Items Table ─────────────────────────────────────────
    const tableHeaders = ["Popis", "Mn.", "MJ", "Cena/MJ", "DPH", "Celkem"]
    const tableColWidths = [contentWidth * 0.40, 12, 12, contentWidth * 0.16, 14, contentWidth * 0.16]

    // Header row
    setColor("#4b5563")
    pdf.setFontSize(7.5)
    pdf.setFont(fontName, "bold")
    let tx = margin
    tableHeaders.forEach((header, i) => {
      const align = i === 0 ? "left" : i === 2 ? "center" : "right"
      const xPos = i === 0 ? tx : tx + tableColWidths[i]!
      if (align === "right") {
        pdf.text(header, xPos, y, { align: "right" })
      } else if (align === "center") {
        pdf.text(header, tx + tableColWidths[i]! / 2, y, { align: "center" })
      } else {
        pdf.text(header, xPos, y)
      }
      tx += tableColWidths[i]!
    })

    y += 2
    setDrawColor("#d1d5db")
    pdf.setLineWidth(0.4)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 5

    // Data rows
    pdf.setFont(fontName, "normal")
    pdf.setFontSize(8)
    invoice.items.forEach((item, index) => {
      tx = margin
      setColor("#1f2937")
      pdf.setFont(fontName, "bold")
      pdf.text(item.description, tx, y)
      tx += tableColWidths[0]!

      pdf.setFont(fontName, "normal")
      setColor("#4b5563")
      pdf.text(String(item.qty), tx + tableColWidths[1]!, y, { align: "right" })
      tx += tableColWidths[1]!

      setColor("#6b7280")
      pdf.text(item.unit ?? "ks", tx + tableColWidths[2]! / 2, y, { align: "center" })
      tx += tableColWidths[2]!

      setColor("#4b5563")
      pdf.text(fmtCurrency(item.price), tx + tableColWidths[3]!, y, { align: "right" })
      tx += tableColWidths[3]!

      setColor("#6b7280")
      pdf.text(`${item.vat ?? 0}%`, tx + tableColWidths[4]!, y, { align: "right" })
      tx += tableColWidths[4]!

      setColor("#1f2937")
      pdf.setFont(fontName, "bold")
      pdf.text(fmtCurrency(calculateItemTotal(item)), tx + tableColWidths[5]!, y, { align: "right" })

      y += 5
      if (index < invoice.items.length - 1) {
        setDrawColor("#e5e7eb")
        pdf.setLineWidth(0.2)
        pdf.line(margin, y - 2, pageWidth - margin, y - 2)
      }
    })

    y += 4

    // ── Totals ──────────────────────────────────────────────
    const totalsX = pageWidth - margin - 55
    const totalsWidth = 55

    Object.entries(vatSummary).forEach(([rate, { vat }]) => {
      setColor("#6b7280")
      pdf.setFontSize(8)
      pdf.setFont(fontName, "normal")
      pdf.text(`DPH ${rate}%`, totalsX, y)
      pdf.text(fmtCurrency(vat), totalsX + totalsWidth, y, { align: "right" })
      y += 4
    })

    y += 2
    setDrawColor("#e5e7eb")
    pdf.setLineWidth(0.2)
    pdf.line(totalsX, y, totalsX + totalsWidth, y)
    y += 5

    setColor("#4b5563")
    pdf.setFontSize(8)
    pdf.text("Základ", totalsX, y)
    pdf.text(fmtCurrency(subtotal), totalsX + totalsWidth, y, { align: "right" })
    y += 4

    pdf.text("DPH", totalsX, y)
    pdf.text(fmtCurrency(totalVat), totalsX + totalsWidth, y, { align: "right" })
    y += 4

    setDrawColor("#9ca3af")
    pdf.setLineWidth(0.4)
    pdf.line(totalsX, y, totalsX + totalsWidth, y)
    y += 5
    setColor("#1f2937")
    pdf.setFontSize(10)
    pdf.setFont(fontName, "bold")
    pdf.text("Celkem", totalsX, y)
    setColor("#2563eb")
    pdf.setFontSize(14)
    pdf.text(fmtCurrency(total), totalsX + totalsWidth, y, { align: "right" })

    // ── QR Payment Code ──────────────────────────────────────
    if (spaydString) {
      try {
        const qrUrl = await QRCode.toDataURL(spaydString, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: "M",
        })

        y += 12
        const qrSize = 35
        const qrX = margin

        setFillColor("#f9fafb")
        pdf.roundedRect(qrX, y - 2, contentWidth, qrSize + 12, 2, 2, "F")

        pdf.addImage(qrUrl, "PNG", qrX + 4, y, qrSize, qrSize)

        const textX = qrX + qrSize + 10
        setColor("#111827")
        pdf.setFontSize(9)
        pdf.setFont(fontName, "bold")
        pdf.text("QR Platba", textX, y + 6)

        setColor("#6b7280")
        pdf.setFontSize(7.5)
        pdf.setFont(fontName, "normal")
        pdf.text("Naskenujte QR kód v bankovní aplikaci", textX, y + 11)
        pdf.text("pro rychlou úhradu faktury.", textX, y + 15)

        setColor("#4b5563")
        pdf.setFontSize(7)
        pdf.text(`IBAN: ${iban}`, textX, y + 22)
        pdf.text(`Částka: ${fmtCurrency(total)}`, textX, y + 26)
        pdf.text(`VS: ${variableSymbol}`, textX, y + 30)
      } catch {
        // QR generation failed, skip
      }
    }

    return pdf
  }

  const handleDownloadPDF = async () => {
    try {
      const pdf = await generatePDFDocument()
      pdf.save(`faktura-${invoice.id}.pdf`)
    } catch (err) {
      toast.error("Nepodařilo se vygenerovat PDF. Zkuste to prosím znovu.")
      console.error(err)
    }
  }

  const openEmailDialog = () => {
    setEmailTo(invoice.customer.contact ?? "")
    setEmailSubject(`Faktura ${invoice.id} – ${supplier.name}`)
    setEmailBody(
      `Dobrý den,\n\nv příloze zasíláme fakturu č. ${invoice.id} na částku ${formatCurrency(total)}.\nDatum splatnosti: ${formatDate(invoice.dueDate)}.\n\nDěkujeme za Vaši spolupráci.\n\nS pozdravem\n${supplier.name}`
    )
    setEmailStep("form")
    setEmailError("")
    setShowEmailDialog(true)
  }

  const handleSendEmail = async () => {
    setEmailStep("sending")
    try {
      const pdf = await generatePDFDocument()
      const pdfBlob = pdf.output("arraybuffer")
      const bytes = new Uint8Array(pdfBlob)
      let binary = ""
      for (const byte of bytes) {
        binary += String.fromCharCode(byte)
      }
      const pdfBase64 = btoa(binary)

      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          html: emailBody.replace(/\n/g, "<br />"),
          pdfBase64,
          invoiceId: invoice.id,
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Nepodařilo se odeslat email")
      }

      setEmailStep("success")
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Neznámá chyba")
      setEmailStep("error")
    }
  }

  return (
    <>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/faktury">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold">
                Faktura {invoice.id}
              </h1>
              {/* Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
                    <div className="flex items-center gap-1">
                      {getStatusBadge(currentStatusName)}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {statusOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => handleStatusChange(option.id)}
                      className={currentStatusName === option.name ? "bg-accent" : ""}
                    >
                      {getStatusBadge(option.name)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-xs text-muted-foreground">
              Vystaveno {formatDate(invoice.issueDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/faktury/${invoiceId}/upravit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Upravit
            </Link>
          </Button>
          {!isDraft && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Tisk
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEmailDialog}>
                <Send className="mr-2 h-3.5 w-3.5" />
                Odeslat emailem
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Duplikovat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Smazat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Invoice Document */}
      <Card className="overflow-hidden">
        <div 
          ref={invoiceRef} 
          style={{ 
            backgroundColor: "#ffffff", 
            color: "#111827",
            padding: "20px",
            fontFamily: "Helvetica, Arial, sans-serif"
          }}
        >
          {/* Header */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-start",
            marginBottom: "24px", 
            paddingBottom: "16px", 
            borderBottom: "1px solid #e5e7eb" 
          }}>
            <div>
              <p style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Dodavatel</p>
              <p style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>{supplier.name}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Faktura</p>
              <p style={{ fontSize: "20px", fontWeight: 700, color: "#2563eb" }}>{invoice.id}</p>
            </div>
          </div>

          {/* Supplier & Customer */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div style={{ backgroundColor: "#f9fafb", borderRadius: "6px", padding: "12px" }}>
              <p style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Dodavatel</p>
              <p style={{ fontWeight: 500, fontSize: "13px", color: "#111827" }}>{supplier.name}</p>
              <p style={{ fontSize: "11px", color: "#4b5563" }}>{supplier.street}</p>
              <p style={{ fontSize: "11px", color: "#4b5563" }}>{supplier.zip} {supplier.city}</p>
              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e5e7eb", fontSize: "11px" }}>
                <span style={{ color: "#6b7280" }}>IČO:</span> <span style={{ fontWeight: 500, color: "#111827" }}>{supplier.ico}</span>
                <span style={{ margin: "0 8px", color: "#d1d5db" }}>|</span>
                <span style={{ color: "#6b7280" }}>DIČ:</span> <span style={{ fontWeight: 500, color: "#111827" }}>{supplier.dic}</span>
              </div>
            </div>
            <div style={{ backgroundColor: "#f9fafb", borderRadius: "6px", padding: "12px" }}>
              <p style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Odběratel</p>
              <p style={{ fontWeight: 500, fontSize: "13px", color: "#111827" }}>{customer.name}</p>
              <p style={{ fontSize: "11px", color: "#4b5563" }}>{customer.street}</p>
              <p style={{ fontSize: "11px", color: "#4b5563" }}>{customer.zip} {customer.city}</p>
              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e5e7eb", fontSize: "11px" }}>
                <span style={{ color: "#6b7280" }}>IČO:</span> <span style={{ fontWeight: 500, color: "#111827" }}>{customer.ico}</span>
                {customer.dic && (
                  <>
                    <span style={{ margin: "0 8px", color: "#d1d5db" }}>|</span>
                    <span style={{ color: "#6b7280" }}>DIČ:</span> <span style={{ fontWeight: 500, color: "#111827" }}>{customer.dic}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "24px", fontSize: "11px" }}>
            <div>
              <p style={{ color: "#6b7280", marginBottom: "2px" }}>Datum vystavení</p>
              <p style={{ fontWeight: 500, color: "#111827" }}>{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p style={{ color: "#6b7280", marginBottom: "2px" }}>DUZP</p>
              <p style={{ fontWeight: 500, color: "#111827" }}>{formatDate(invoice.duzpDate)}</p>
            </div>
            <div>
              <p style={{ color: "#6b7280", marginBottom: "2px" }}>Datum splatnosti</p>
              <p style={{ fontWeight: 500, color: "#111827" }}>{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p style={{ color: "#6b7280", marginBottom: "2px" }}>Způsob platby</p>
              <p style={{ fontWeight: 500, color: "#111827" }}>{paymentMethodLabels[paymentMethod] ?? paymentMethod}</p>
            </div>
            <div>
              <p style={{ color: "#6b7280", marginBottom: "2px" }}>Variabilní symbol</p>
              <p style={{ fontWeight: 500, color: "#111827" }}>{variableSymbol}</p>
            </div>
          </div>

          {/* Bank Account */}
          <div style={{ backgroundColor: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "6px", padding: "12px", marginBottom: "24px" }}>
            <p style={{ fontSize: "11px", color: "#1d4ed8", marginBottom: "2px" }}>Bankovní spojení</p>
            <p style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "14px", fontWeight: 600, color: "#1e40af" }}>
              {supplier.bankAccount}/{supplier.bankCode}
            </p>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: "16px", overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #d1d5db" }}>
                  <th style={{ padding: "8px 4px", textAlign: "left", fontWeight: 600, color: "#4b5563" }}>Popis</th>
                  <th style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600, color: "#4b5563", width: "50px" }}>Mn.</th>
                  <th style={{ padding: "8px 4px", textAlign: "center", fontWeight: 600, color: "#4b5563", width: "40px" }}>MJ</th>
                  <th style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600, color: "#4b5563", width: "80px" }}>Cena/MJ</th>
                  <th style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600, color: "#4b5563", width: "50px" }}>DPH</th>
                  <th style={{ padding: "8px 4px", textAlign: "right", fontWeight: 600, color: "#4b5563", width: "100px" }}>Celkem</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: index !== invoice.items.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                    <td style={{ padding: "8px 4px", fontWeight: 500, color: "#1f2937" }}>{item.description}</td>
                    <td style={{ padding: "8px 4px", textAlign: "right", color: "#4b5563" }}>{item.qty}</td>
                    <td style={{ padding: "8px 4px", textAlign: "center", color: "#6b7280" }}>{item.unit ?? "ks"}</td>
                    <td style={{ padding: "8px 4px", textAlign: "right", color: "#4b5563" }}>{formatCurrency(item.price)}</td>
                    <td style={{ padding: "8px 4px", textAlign: "right", color: "#6b7280" }}>{item.vat ?? 0}%</td>
                    <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 500, color: "#1f2937" }}>{formatCurrency(calculateItemTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "220px" }}>
              <div style={{ marginBottom: "8px" }}>
                {Object.entries(vatSummary).map(([rate, { vat }]) => (
                  <div key={rate} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                    <span>DPH {rate}%</span>
                    <span>{formatCurrency(vat)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "8px", marginBottom: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#4b5563", marginBottom: "4px" }}>
                  <span>Základ</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#4b5563" }}>
                  <span>DPH</span>
                  <span>{formatCurrency(totalVat)}</span>
                </div>
              </div>
              <div style={{ borderTop: "2px solid #9ca3af", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>Celkem</span>
                <span style={{ fontSize: "18px", fontWeight: 700, color: "#2563eb" }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* QR Payment Code */}
          {qrDataUrl && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              padding: "16px",
              marginTop: "24px",
              border: "1px solid #e5e7eb",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR Platba"
                style={{ width: "120px", height: "120px" }}
              />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>QR Platba</p>
                <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>
                  Naskenujte QR kód v bankovní aplikaci pro rychlou úhradu faktury.
                </p>
                <div style={{ fontSize: "10px", color: "#4b5563" }}>
                  <p>IBAN: {iban}</p>
                  <p>Částka: {formatCurrency(total)}</p>
                  <p>VS: {variableSymbol}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>

    {/* Email Dialog */}
    <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {emailStep === "success" ? (
              <><CheckCircle2 className="h-5 w-5 text-green-500" /> Email odeslán</>
            ) : emailStep === "error" ? (
              <><XCircle className="h-5 w-5 text-red-500" /> Chyba při odesílání</>
            ) : (
              <><Mail className="h-5 w-5" /> Odeslat fakturu emailem</>
            )}
          </DialogTitle>
          <DialogDescription>
            {emailStep === "success"
              ? `Faktura ${invoice.id} byla úspěšně odeslána na ${emailTo}.`
              : emailStep === "error"
                ? emailError
                : emailStep === "confirm"
                  ? "Opravdu chcete odeslat tuto fakturu?"
                  : "Vyplňte údaje pro odeslání faktury emailem."
            }
          </DialogDescription>
        </DialogHeader>

        {emailStep === "form" && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email-to">Email příjemce</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="zakaznik@firma.cz"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-subject">Předmět</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-body">Zpráva</Label>
              <Textarea
                id="email-body"
                rows={6}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              PDF faktura bude automaticky přiložena jako příloha.
            </p>
          </div>
        )}

        {emailStep === "confirm" && (
          <div className="py-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Příjemce:</span>
                <span className="font-medium">{emailTo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Předmět:</span>
                <span className="font-medium">{emailSubject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Příloha:</span>
                <span className="font-medium">faktura-{invoice.id}.pdf</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Částka:</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}

        {emailStep === "sending" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Odesílám fakturu...</p>
          </div>
        )}

        <DialogFooter>
          {emailStep === "form" && (
            <>
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Zrušit</Button>
              <Button
                onClick={() => setEmailStep("confirm")}
                disabled={!emailTo || !emailSubject}
              >
                Pokračovat
              </Button>
            </>
          )}
          {emailStep === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setEmailStep("form")}>Zpět</Button>
              <Button onClick={handleSendEmail}>
                <Send className="mr-2 h-4 w-4" />
                Odeslat
              </Button>
            </>
          )}
          {(emailStep === "success" || emailStep === "error") && (
            <Button onClick={() => setShowEmailDialog(false)}>
              Zavřít
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
