"use client"

import { useRef } from "react"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Card } from "~/components/ui/card"
import {
  ArrowLeft,
  Download,
  Send,
  Printer,
  Copy,
  MoreHorizontal,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import Link from "next/link"

interface InvoiceDetailProps {
  invoiceId: string
}

const mockInvoicesData: Record<string, {
  id: string
  number: string
  type: "invoice" | "proforma" | "credit"
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  issueDate: string
  dueDate: string
  taxDate: string
  paymentMethod: string
  variableSymbol: string
  supplier: {
    name: string
    street: string
    city: string
    zip: string
    ico: string
    dic: string
    bankAccount: string
    bankCode: string
  }
  customer: {
    name: string
    street: string
    city: string
    zip: string
    ico: string
    dic?: string
  }
  items: Array<{
    id: string
    quantity: number
    unit: string
    description: string
    unitPrice: number
    vatRate: number
  }>
  note?: string
}> = {
  "1": {
    id: "1",
    number: "25-001",
    type: "invoice",
    status: "paid",
    issueDate: "2025-01-15",
    dueDate: "2025-01-29",
    taxDate: "2025-01-15",
    paymentMethod: "bank",
    variableSymbol: "25001",
    supplier: {
      name: "Moje Firma s.r.o.",
      street: "Hlavní 123",
      city: "Praha",
      zip: "110 00",
      ico: "12345678",
      dic: "CZ12345678",
      bankAccount: "123456789",
      bankCode: "0100",
    },
    customer: {
      name: "ABC Company s.r.o.",
      street: "Vedlejší 456",
      city: "Brno",
      zip: "602 00",
      ico: "87654321",
      dic: "CZ87654321",
    },
    items: [
      { id: "1", quantity: 10, unit: "hod", description: "Webdesign - návrh", unitPrice: 1500, vatRate: 21 },
      { id: "2", quantity: 25, unit: "hod", description: "Vývoj webové aplikace", unitPrice: 2000, vatRate: 21 },
      { id: "3", quantity: 5, unit: "hod", description: "SEO optimalizace", unitPrice: 1200, vatRate: 21 },
      { id: "4", quantity: 1, unit: "ks", description: "Hosting na 1 rok", unitPrice: 3000, vatRate: 21 },
    ],
    note: "Děkujeme za spolupráci.",
  },
  "2": {
    id: "2",
    number: "25-002",
    type: "invoice",
    status: "sent",
    issueDate: "2025-01-18",
    dueDate: "2025-02-01",
    taxDate: "2025-01-18",
    paymentMethod: "bank",
    variableSymbol: "25002",
    supplier: {
      name: "Moje Firma s.r.o.",
      street: "Hlavní 123",
      city: "Praha",
      zip: "110 00",
      ico: "12345678",
      dic: "CZ12345678",
      bankAccount: "123456789",
      bankCode: "0100",
    },
    customer: {
      name: "XYZ Services a.s.",
      street: "Průmyslová 789",
      city: "Ostrava",
      zip: "702 00",
      ico: "11223344",
    },
    items: [
      { id: "1", quantity: 20, unit: "hod", description: "Konzultace a poradenství", unitPrice: 1800, vatRate: 21 },
      { id: "2", quantity: 1, unit: "ks", description: "Implementace systému", unitPrice: 9500, vatRate: 21 },
    ],
  },
  "3": {
    id: "3",
    number: "25-003",
    type: "invoice",
    status: "overdue",
    issueDate: "2025-01-20",
    dueDate: "2025-02-03",
    taxDate: "2025-01-20",
    paymentMethod: "bank",
    variableSymbol: "25003",
    supplier: {
      name: "Moje Firma s.r.o.",
      street: "Hlavní 123",
      city: "Praha",
      zip: "110 00",
      ico: "12345678",
      dic: "CZ12345678",
      bankAccount: "123456789",
      bankCode: "0100",
    },
    customer: {
      name: "Tech Solutions s.r.o.",
      street: "Technická 321",
      city: "Plzeň",
      zip: "301 00",
      ico: "55667788",
      dic: "CZ55667788",
    },
    items: [
      { id: "1", quantity: 40, unit: "hod", description: "Vývoj mobilní aplikace", unitPrice: 2200, vatRate: 21 },
      { id: "2", quantity: 1, unit: "ks", description: "Publikace v App Store", unitPrice: 1000, vatRate: 21 },
    ],
  },
}

const typeLabels: Record<string, string> = {
  invoice: "Faktura",
  proforma: "Zálohová faktura",
  credit: "Dobropis",
}

const paymentMethodLabels: Record<string, string> = {
  bank: "Bankovní převod",
  card: "Kartou",
  cash: "Hotově",
  cod: "Dobírka",
  other: "Jiná",
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const invoice = mockInvoicesData[invoiceId] ?? mockInvoicesData["1"]

  if (!invoice) {
    return <div>Faktura nenalezena.</div>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("cs-CZ")
  }

  const calculateItemTotal = (item: typeof invoice.items[0]) => {
    return item.quantity * item.unitPrice
  }

  const calculateItemVat = (item: typeof invoice.items[0]) => {
    return calculateItemTotal(item) * (item.vatRate / 100)
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  const totalVat = invoice.items.reduce((sum, item) => sum + calculateItemVat(item), 0)
  const total = subtotal + totalVat

  const vatSummary = invoice.items.reduce((acc, item) => {
    const rate = item.vatRate
    acc[rate] ??= { base: 0, vat: 0 }
    acc[rate].base += calculateItemTotal(item)
    acc[rate].vat += calculateItemVat(item)
    return acc
  }, {} as Record<number, { base: number; vat: number }>)

  const getStatusBadge = () => {
    switch (invoice.status) {
      case "paid":
        return (
          <Badge className="bg-green-500/10 text-green-500 text-xs gap-1">
            <CheckCircle className="h-3 w-3" />
            Zaplaceno
          </Badge>
        )
      case "sent":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 text-xs gap-1">
            <Clock className="h-3 w-3" />
            Čeká na platbu
          </Badge>
        )
      case "overdue":
        return (
          <Badge className="bg-red-500/10 text-red-500 text-xs gap-1">
            <AlertCircle className="h-3 w-3" />
            Po splatnosti
          </Badge>
        )
      case "draft":
        return (
          <Badge className="bg-muted text-muted-foreground text-xs gap-1">
            <FileText className="h-3 w-3" />
            Koncept
          </Badge>
        )
      default:
        return <Badge>{invoice.status}</Badge>
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    const html2canvas = (await import("html2canvas")).default
    const { jsPDF } = await import("jspdf")

    if (invoiceRef.current) {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      })
      
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })
      
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      pdf.save(`faktura-${invoice.number}.pdf`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">
                {typeLabels[invoice.type]} {invoice.number}
              </h1>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-muted-foreground">
              Vystaveno {formatDate(invoice.issueDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Tisk
          </Button>
          <Button size="sm" onClick={handleDownloadPDF}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            PDF
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
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

      <Card className="overflow-hidden">
        <div ref={invoiceRef} className="bg-white text-gray-900 p-5 sm:p-6 print:p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dodavatel</p>
              <p className="font-semibold text-sm">{invoice.supplier.name}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{typeLabels[invoice.type]}</p>
              <p className="text-xl font-bold text-blue-600">{invoice.number}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Dodavatel</p>
              <p className="font-medium text-sm">{invoice.supplier.name}</p>
              <p className="text-xs text-gray-600">{invoice.supplier.street}</p>
              <p className="text-xs text-gray-600">{invoice.supplier.zip} {invoice.supplier.city}</p>
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                <span className="text-gray-500">IČO:</span> <span className="font-medium">{invoice.supplier.ico}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-gray-500">DIČ:</span> <span className="font-medium">{invoice.supplier.dic}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Odběratel</p>
              <p className="font-medium text-sm">{invoice.customer.name}</p>
              <p className="text-xs text-gray-600">{invoice.customer.street}</p>
              <p className="text-xs text-gray-600">{invoice.customer.zip} {invoice.customer.city}</p>
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                <span className="text-gray-500">IČO:</span> <span className="font-medium">{invoice.customer.ico}</span>
                {invoice.customer.dic && (
                  <>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-gray-500">DIČ:</span> <span className="font-medium">{invoice.customer.dic}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
            <div>
              <p className="text-gray-500 mb-0.5">Datum vystavení</p>
              <p className="font-medium">{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Datum splatnosti</p>
              <p className="font-medium">{formatDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Způsob platby</p>
              <p className="font-medium">{paymentMethodLabels[invoice.paymentMethod]}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Variabilní symbol</p>
              <p className="font-medium">{invoice.variableSymbol}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-6">
            <p className="text-xs text-blue-700 mb-0.5">Bankovní spojení</p>
            <p className="font-mono text-sm font-semibold text-blue-800">
              {invoice.supplier.bankAccount}/{invoice.supplier.bankCode}
            </p>
          </div>

          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-2 text-left font-semibold text-gray-600">Popis</th>
                  <th className="py-2 text-right font-semibold text-gray-600 w-14">Mn.</th>
                  <th className="py-2 text-center font-semibold text-gray-600 w-10">MJ</th>
                  <th className="py-2 text-right font-semibold text-gray-600 w-20">Cena/MJ</th>
                  <th className="py-2 text-right font-semibold text-gray-600 w-12">DPH</th>
                  <th className="py-2 text-right font-semibold text-gray-600 w-24">Celkem</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className={index !== invoice.items.length - 1 ? "border-b border-gray-100" : ""}>
                    <td className="py-2 font-medium text-gray-800">{item.description}</td>
                    <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-2 text-center text-gray-500">{item.unit}</td>
                    <td className="py-2 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right text-gray-500">{item.vatRate}%</td>
                    <td className="py-2 text-right font-medium text-gray-800">{formatCurrency(calculateItemTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-64">
              <div className="space-y-1 text-xs mb-2">
                {Object.entries(vatSummary).map(([rate, { base, vat }]) => (
                  <div key={rate} className="flex justify-between text-gray-500">
                    <span>DPH {rate}%</span>
                    <span>{formatCurrency(vat)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Základ</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>DPH</span>
                  <span>{formatCurrency(totalVat)}</span>
                </div>
              </div>
              <div className="border-t-2 border-gray-300 mt-2 pt-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-800">Celkem</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {invoice.note && (
            <div className="mt-4 pt-3 border-t border-gray-200 text-xs">
              <p className="text-gray-500 mb-0.5">Poznámka</p>
              <p className="text-gray-700">{invoice.note}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
