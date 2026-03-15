"use client"

import { useState, useCallback } from "react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Clock,
  Ban,
  CreditCard,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import DashboardNavbar from "~/app/componenty/navbar"
import { api } from "~/trpc/react"

interface MatchResult {
  invoiceId: string
  vs: string
  parsedAmount: number
  invoiceTotal: number
  status: "matched" | "amount_mismatch" | "not_found" | "already_paid"
  message: string
}

interface ProcessResult {
  accountVerification: {
    verified: boolean
    message: string
  }
  results: MatchResult[]
  summary: {
    total: number
    matched: number
    mismatched: number
    notFound: number
    alreadyPaid: number
  }
  message: string
  error?: string
}

function getStatusBadge(statusName: string) {
  switch (statusName) {
    case "zaplacena":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          Zaplacena
        </Badge>
      )
    case "ceka":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          Čeká
        </Badge>
      )
    case "po_splatnosti":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          Po splatnosti
        </Badge>
      )
    case "koncept":
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200">
          Koncept
        </Badge>
      )
    default:
      return <Badge variant="outline">{statusName}</Badge>
  }
}

function getResultIcon(status: string) {
  switch (status) {
    case "matched":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    case "amount_mismatch":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />
    case "not_found":
      return <XCircle className="h-5 w-5 text-red-500" />
    case "already_paid":
      return <CheckCircle2 className="h-5 w-5 text-blue-500" />
    default:
      return null
  }
}

function getResultBadge(status: string) {
  switch (status) {
    case "matched":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          Spárováno
        </Badge>
      )
    case "amount_mismatch":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          Nesedí částka
        </Badge>
      )
    case "not_found":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          Nenalezeno
        </Badge>
      )
    case "already_paid":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
          Již zaplacena
        </Badge>
      )
    default:
      return null
  }
}

export default function BankStatementPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch unpaid invoices
  const { data: invoices, refetch: refetchInvoices } =
    api.invoice.get.useQuery({})

  const unpaidInvoices = invoices?.filter(
    (inv: { status: { name: string } }) =>
      inv.status.name === "ceka" || inv.status.name === "po_splatnosti"
  )

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 0,
    }).format(amount)

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("cs-CZ")

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile)
      setResult(null)
      setError(null)
    } else {
      setError("Nahrajte prosím PDF soubor.")
    }
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) {
        setFile(selected)
        setResult(null)
        setError(null)
      }
    },
    []
  )

  const handleUpload = async () => {
    if (!file) return

    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/bank-statement", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json()) as ProcessResult

      if (!response.ok) {
        setError(data.error ?? "Chyba při zpracování výpisu.")
        return
      }

      setResult(data)
      // Refetch invoices to reflect any status changes
      await refetchInvoices()
    } catch {
      setError("Chyba při nahrávání souboru.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
  }

  const totalUnpaid =
    unpaidInvoices?.reduce(
      (sum: number, inv: { total: number }) => sum + inv.total,
      0
    ) ?? 0

  return (
    <div className="min-h-screen bg-blue-50/50">
      <DashboardNavbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Import výpisu z účtu
            </h1>
            <p className="text-muted-foreground mt-1">
              Nahrajte PDF výpis z banky a automaticky spárujte platby s
              fakturami
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column — Upload + Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload area */}
              <Card className="overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Nahrát výpis
                  </h2>

                  {/* Drag & Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      relative border-2 border-dashed rounded-xl p-12
                      transition-all duration-200 cursor-pointer
                      flex flex-col items-center justify-center gap-4 text-center
                      ${
                        isDragging
                          ? "border-primary bg-primary/5 scale-[1.01]"
                          : file
                            ? "border-emerald-300 bg-emerald-50/50"
                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
                      }
                    `}
                    onClick={() =>
                      document.getElementById("pdf-upload")?.click()
                    }
                  >
                    <input
                      id="pdf-upload"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    {file ? (
                      <>
                        <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                          <FileText className="h-7 w-7 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-base font-medium text-emerald-700">
                            {file.name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {(file.size / 1024).toFixed(1)} KB • Klikněte pro
                            změnu souboru
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                          <Upload className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-base font-medium">
                            Přetáhněte PDF výpis sem
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            nebo klikněte pro výběr souboru
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={handleUpload}
                      disabled={!file || isProcessing}
                      className="flex-1 bg-primary hover:bg-primary/90"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Zpracovávám...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Zpracovat výpis
                        </>
                      )}
                    </Button>
                    {(file ?? result) && (
                      <Button variant="outline" onClick={handleReset} size="lg">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    )}
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                      <XCircle className="h-4 w-4 shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Results */}
              {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Account verification */}
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      {result.accountVerification.verified ? (
                        <ShieldCheck className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="h-6 w-6 text-amber-500" />
                      )}
                      <div>
                        <p
                          className={`text-sm font-medium ${result.accountVerification.verified ? "text-emerald-700" : "text-amber-700"}`}
                        >
                          {result.accountVerification.verified
                            ? "Účet ověřen"
                            : "Účet neověřen"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.accountVerification.message}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">
                        {result.summary.matched}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Spárováno
                      </p>
                    </Card>
                    <Card className="p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        {result.summary.mismatched}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nesedí částka
                      </p>
                    </Card>
                    <Card className="p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {result.summary.notFound}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nenalezeno
                      </p>
                    </Card>
                    <Card className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {result.summary.alreadyPaid}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Již zaplaceno
                      </p>
                    </Card>
                  </div>

                  {/* Results table */}
                  {result.results.length > 0 && (
                    <Card className="overflow-hidden">
                      <div className="p-6 pb-4">
                        <h2 className="text-lg font-semibold">
                          Výsledky párování
                        </h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr className="border-b border-border">
                              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                                Stav
                              </th>
                              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                                VS / Faktura
                              </th>
                              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                                Částka výpisu
                              </th>
                              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                                Částka faktury
                              </th>
                              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                                Detail
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.results.map((r, i) => (
                              <tr
                                key={i}
                                className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    {getResultIcon(r.status)}
                                    {getResultBadge(r.status)}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {r.status !== "not_found" ? (
                                    <Link
                                      href={`/faktury/${r.invoiceId}`}
                                      className="text-sm font-medium text-primary hover:underline"
                                    >
                                      {r.invoiceId}
                                    </Link>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      {r.vs}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium">
                                  {formatCurrency(r.parsedAmount)}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  {r.invoiceTotal > 0
                                    ? formatCurrency(r.invoiceTotal)
                                    : "—"}
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-muted-foreground">
                                    {r.message}
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Right column — Unpaid invoices */}
            <div className="space-y-6">
              {/* Stats card */}
              <Card className="p-6 bg-linear-to-br from-orange-50 to-amber-50 border-amber-200/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Neuhrazené faktury
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      {unpaidInvoices?.length ?? 0}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-amber-200/50">
                  <p className="text-sm text-muted-foreground">
                    Celkem k úhradě
                  </p>
                  <p className="text-xl font-bold text-amber-700">
                    {formatCurrency(totalUnpaid)}
                  </p>
                </div>
              </Card>

              {/* Unpaid invoices list */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Ban className="h-4 w-4 text-muted-foreground" />
                    Čekající na úhradu
                  </h3>
                </div>
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {!unpaidInvoices || unpaidInvoices.length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Všechny faktury jsou uhrazeny! 🎉
                      </p>
                    </div>
                  ) : (
                    unpaidInvoices.map(
                      (inv: {
                        id: string
                        total: number
                        dueDate: string | Date
                        status: { name: string }
                        customer: { name: string } | null
                      }) => {
                        const isOverdue =
                          inv.status.name === "po_splatnosti" ||
                          new Date(inv.dueDate) < new Date()
                        return (
                          <Link
                            key={inv.id}
                            href={`/faktury/${inv.id}`}
                            className="block px-4 py-3 hover:bg-accent/50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    {inv.id}
                                  </p>
                                  {getStatusBadge(inv.status.name)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {inv.customer?.name ?? "—"} •{" "}
                                  <span
                                    className={
                                      isOverdue ? "text-red-500 font-medium" : ""
                                    }
                                  >
                                    Splatnost {formatDate(inv.dueDate)}
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <span className="text-sm font-bold whitespace-nowrap">
                                  {formatCurrency(inv.total)}
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </Link>
                        )
                      }
                    )
                  )}
                </div>
                {unpaidInvoices && unpaidInvoices.length > 0 && (
                  <div className="p-3 border-t border-border bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      asChild
                    >
                      <Link href="/faktury">Zobrazit všechny faktury</Link>
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
