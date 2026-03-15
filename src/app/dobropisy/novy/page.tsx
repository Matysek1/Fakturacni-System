"use client"

import { useState } from "react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Textarea } from "../../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Calendar } from "../../../components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover"
import { cn } from "~/lib/utils"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { CalendarIcon, Plus, X, ChevronLeft, Loader2 } from "lucide-react"
import DashboardNavbar from "~/app/componenty/navbar"
import { api } from "~/trpc/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

interface CreditNoteItem {
  id: string
  quantity: number
  unit: string
  description: string
  pricePerUnit: number
  vatRate: number
}

export default function NewCreditNoteForm() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [issueDate, setIssueDate] = useState<Date>(new Date())
  const [duzpDate, setDuzpDate] = useState<Date>(new Date())
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const router = useRouter()

  const fetchInvoices = api.invoice.get.useQuery({})
  const previewNumber = api.creditNoteNumbering.preview.useQuery()
  const saveCreditNote = api.creditNote.create.useMutation()
  const companyQuery = api.company.get.useQuery()

  const [items, setItems] = useState<CreditNoteItem[]>([
    {
      id: "1",
      quantity: 1,
      unit: "ks",
      description: "",
      pricePerUnit: 0,
      vatRate: 21,
    },
  ])

  // Guard: block everything if company settings are not configured
  const companyMissing = !companyQuery.isLoading && (
    !companyQuery.data?.name ||
    !companyQuery.data?.ico ||
    !companyQuery.data?.address ||
    !companyQuery.data?.bankAccount
  )

  if (companyMissing) {
    return (
      <div className="bg-blue-50/50">
        <DashboardNavbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Firemní údaje nejsou nastaveny</h2>
            <p className="text-muted-foreground">Před vytvořením opravného dokladu musíte vyplnit údaje o vaší firmě (název, IČO, adresa, bankovní účet).</p>
          </div>
          <Button asChild>
            <Link href="/nastaveni">Přejít do nastavení</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Role guard — accountant cannot create credit notes
  if (session?.user.role === 2) {
    return (
      <div className="bg-blue-50/50">
        <DashboardNavbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-xl font-semibold">Nemáte oprávnění vystavovat opravné doklady.</p>
        </div>
      </div>
    )
  }

  // When an invoice is selected, pre-fill items from it
  const selectedInvoiceData = (fetchInvoices.data as {
    id: string
    customerId: number
    total: number
    customer: { name: string }
  }[])?.find((inv) => inv.id === selectedInvoice)

  const addItem = () => {
    const newItem: CreditNoteItem = {
      id: Date.now().toString(),
      quantity: 1,
      unit: "ks",
      description: "",
      pricePerUnit: 0,
      vatRate: 21,
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof CreditNoteItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  // Compute totals (credit notes are negative)
  const itemTotals = items.map((item) => {
    const base = item.quantity * item.pricePerUnit
    const vat = base * (item.vatRate / 100)
    return { base, vat, total: base + vat }
  })
  const grandTotal = itemTotals.reduce((sum, t) => sum + t.total, 0)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(amount)

  const handleSubmit = async () => {
    if (!selectedInvoice || !selectedInvoiceData) return
    
    // Validate items before submitting to prevent Zod 400 errors
    const hasInvalidItems = items.some(item => !item.description.trim() || item.pricePerUnit === 0)
    if (hasInvalidItems) {
      toast.error("Všechny položky musí mít vyplněný popis a cenu.")
      return
    }

    setIsLoading(true)
    try {
      await saveCreditNote.mutateAsync({
        invoiceId: selectedInvoice,
        customerId: selectedInvoiceData.customerId,
        issueDate,
        duzpDate,
        total: -Math.abs(grandTotal), // credit notes are negative
        reason: reason || undefined,
        items: items.map((item) => ({
          description: item.description,
          qty: item.quantity,
          price: -Math.abs(item.pricePerUnit), // negative price
          vat: item.vatRate,
          unit: item.unit,
        })),
      })
      toast.success("Opravný doklad byl úspěšně vytvořen.")
      router.push("/dobropisy")
    } catch {
      toast.error("Chyba při vytváření opravného dokladu.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50/50">
      <DashboardNavbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button + title */}
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dobropisy">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nový opravný daňový doklad</h1>
            <p className="text-muted-foreground mt-1">
              Číslo:{" "}
              <span className="font-mono font-semibold">
                {previewNumber.data?.creditNoteNumber ?? "…"}
              </span>
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left column: form ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice selection */}
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="text-lg font-semibold">Odkazovaná faktura</h2>
              <div className="space-y-2">
                <Label>Vyberte fakturu</Label>
                <Select
                  value={selectedInvoice ?? ""}
                  onValueChange={(v) => setSelectedInvoice(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte fakturu..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(fetchInvoices.data as { id: string; customer: { name: string }; total: number }[])?.map(
                      (inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.id} — {inv.customer?.name ?? "Neznámý"} ({formatCurrency(inv.total)})
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedInvoiceData && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm">
                  <p>
                    <strong>Klient:</strong> {selectedInvoiceData.customer?.name}
                  </p>
                  <p>
                    <strong>Celkem na faktuře:</strong>{" "}
                    {formatCurrency(selectedInvoiceData.total)}
                  </p>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="text-lg font-semibold">Důvod opravného dokladu</h2>
              <Textarea
                placeholder="Důvod vystavení opravného daňového dokladu..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {/* Dates */}
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="text-lg font-semibold">Datumy</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Datum vystavení</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !issueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(issueDate, "d. MMMM yyyy", { locale: cs })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={issueDate}
                        onSelect={(d) => d && setIssueDate(d)}
                        locale={cs}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>DUZP</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !duzpDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(duzpDate, "d. MMMM yyyy", { locale: cs })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={duzpDate}
                        onSelect={(d) => d && setDuzpDate(d)}
                        locale={cs}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Položky opravného dokladu</h2>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-4 w-4" />
                  Přidat položku
                </Button>
              </div>

              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Položka {index + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-7 w-7"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Popis</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="Popis položky"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Množství</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Jednotka</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cena/ks</Label>
                      <Input
                        type="number"
                        value={item.pricePerUnit}
                        onChange={(e) =>
                          updateItem(item.id, "pricePerUnit", Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">DPH %</Label>
                      <Input
                        type="number"
                        value={item.vatRate}
                        onChange={(e) =>
                          updateItem(item.id, "vatRate", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    Celkem: <span className="font-semibold text-foreground">{formatCurrency(itemTotals[index]?.total ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column: summary ── */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6 space-y-4 sticky top-24">
              <h2 className="text-lg font-semibold">Souhrn</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Faktura</span>
                  <span className="font-medium">{selectedInvoice ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Klient</span>
                  <span className="font-medium">
                    {selectedInvoiceData?.customer?.name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Datum vystavení</span>
                  <span className="font-medium">
                    {format(issueDate, "d. M. yyyy", { locale: cs })}
                  </span>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Základ</span>
                  <span className="font-medium">
                    {formatCurrency(itemTotals.reduce((s, t) => s + t.base, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">DPH</span>
                  <span className="font-medium">
                    {formatCurrency(itemTotals.reduce((s, t) => s + t.vat, 0))}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                  <span>Opravný doklad celkem</span>
                  <span className="text-red-600">-{formatCurrency(Math.abs(grandTotal))}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={isLoading || !selectedInvoice || items.some((i) => !i.description)}
                onClick={handleSubmit}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládám...
                  </>
                ) : (
                  "Vystavit opravný doklad"
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
