"use client"

import { useState, useEffect, use } from "react"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { Label } from "../../../../components/ui/label"
import { Textarea } from "../../../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select"
import { Calendar } from "../../../../components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover"
import { cn } from "~/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Plus, X, ChevronLeft, Loader2, GripVertical, Percent } from "lucide-react"
import DashboardNavbar from "~/app/componenty/navbar"
import { api } from "~/trpc/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface InvoiceItem {
  id: string
  quantity: number
  unit: string
  description: string
  pricePerUnit: number
  vatRate: number
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const invoiceId = resolvedParams.id

  const [isLoading, setIsLoading] = useState(false)
  const [issueDate, setIssueDate] = useState<Date>(new Date())
  const [taxableDate, setTaxableDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date>(new Date())
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [statusId, setStatusId] = useState(2)

  const fetchCustomers = api.customer.get.useQuery()
  const router = useRouter()
  const { data: invoice, isLoading: invoiceLoading } = api.invoice.getById.useQuery({ id: invoiceId })
  const updateInvoice = api.invoice.update.useMutation()

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", quantity: 1, unit: "ks", description: "", pricePerUnit: 0, vatRate: 21 },
  ])

  // Pre-fill form when invoice data loads
  useEffect(() => {
    if (!invoice) return

    setIssueDate(new Date(invoice.issueDate))
    setTaxableDate(new Date(invoice.duzpDate))
    setDueDate(new Date(invoice.dueDate))
    setSelectedCustomer(invoice.customerId.toString())
    setStatusId(invoice.statusId)

    if (invoice.discount && invoice.discount > 0) {
      setShowDiscount(true)
      setDiscountPercent(invoice.discount)
    }

    if (invoice.items.length > 0) {
      setItems(
        invoice.items.map((item, index) => ({
          id: index.toString(),
          quantity: item.qty,
          unit: item.unit ?? "ks",
          description: item.description,
          pricePerUnit: item.price,
          vatRate: item.vat ?? 21,
        }))
      )
    }
  }, [invoice])

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), quantity: 1, unit: "ks", description: "", pricePerUnit: 0, vatRate: 21 },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const calculateTotals = () => {
    const totals: Record<number, { base: number; vat: number }> = {}
    items.forEach((item) => {
      const base = item.quantity * item.pricePerUnit
      const vat = base * (item.vatRate / 100)
      totals[item.vatRate] ??= { base: 0, vat: 0 }
      totals[item.vatRate]!.base += base
      totals[item.vatRate]!.vat += vat
    })
    const totalBase = Object.values(totals).reduce((sum, t) => sum + t.base, 0)
    const totalVat = Object.values(totals).reduce((sum, t) => sum + t.vat, 0)
    let total = totalBase + totalVat
    const discountAmount = total * (discountPercent / 100)
    total = total - discountAmount
    return { totals, total, discountAmount }
  }

  const { totals, total, discountAmount } = calculateTotals()

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await updateInvoice.mutateAsync({
        id: invoiceId,
        customerId: selectedCustomer ? parseInt(selectedCustomer) : undefined,
        issueDate,
        dueDate,
        duzpDate: taxableDate,
        total,
        statusId,
        discount: discountPercent,
        items: items.map((item) => ({
          description: item.description,
          qty: item.quantity,
          unit: item.unit,
          price: item.pricePerUnit,
          vat: item.vatRate,
        })),
      })
      toast.success("Faktura byla úspěšně upravena.")
      router.push(`/faktury/${invoiceId}`)
    } catch (error) {
      console.error("Error updating invoice:", error)
      toast.error("Chyba při úpravě faktury.")
    } finally {
      setIsLoading(false)
    }
  }

  if (invoiceLoading) {
    return (
      <div className="bg-blue-50/50 min-h-screen">
        <DashboardNavbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        <DashboardNavbar />
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Upravit fakturu {invoiceId}
          </h1>
          <Button variant="outline" asChild>
            <a href={`/faktury/${invoiceId}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Zpět
            </a>
          </Button>
        </div>

        {/* Status selector */}
        <div className="bg-card border border-border/50 rounded-lg p-6">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
            <Label className="text-sm font-medium">Stav faktury</Label>
            <Select value={statusId.toString()} onValueChange={(v) => setStatusId(Number(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Koncept</SelectItem>
                <SelectItem value="2">Čeká</SelectItem>
                <SelectItem value="3">Po splatnosti</SelectItem>
                <SelectItem value="4">Zaplacena</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border border-border/50 rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
            <Label className="text-sm font-medium pt-2">Odběratel</Label>
            <Select value={selectedCustomer ?? undefined} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Vyberte odběratele..." />
              </SelectTrigger>
              <SelectContent>
                {fetchCustomers.data?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
            <Label className="text-sm font-medium">Číslo faktury</Label>
            <Input value={invoiceId} readOnly className="max-w-[200px] bg-muted" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Datum vystavení</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(issueDate, "d.M.yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={issueDate} onSelect={(d: Date | undefined) => d && setIssueDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Zdanitelné plnění</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(taxableDate, "d.M.yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={taxableDate} onSelect={(d: Date | undefined) => d && setTaxableDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Splatnost</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dueDate, "d.M.yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={(d: Date | undefined) => d && setDueDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="w-8"></th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Počet</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">MJ</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Popis</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Cena za MJ</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">DPH (%)</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 last:border-0">
                    <td className="p-3"><GripVertical className="h-4 w-4 text-muted-foreground" /></td>
                    <td className="p-3">
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} className="w-20" min="0" />
                    </td>
                    <td className="p-3">
                      <Input value={item.unit} onChange={(e) => updateItem(item.id, "unit", e.target.value)} className="w-20" />
                    </td>
                    <td className="p-3">
                      <Textarea value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} placeholder="Popis položky..." className="min-h-[60px]" />
                    </td>
                    <td className="p-3">
                      <Input type="number" value={item.pricePerUnit} onChange={(e) => updateItem(item.id, "pricePerUnit", Number(e.target.value))} className="w-32" />
                    </td>
                    <td className="p-3">
                      <Select value={item.vatRate.toString()} onValueChange={(v) => updateItem(item.id, "vatRate", Number(v))}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="21">21</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 flex items-center gap-3 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={addItem} className="gap-2 bg-transparent">
              <Plus className="h-4 w-4" /> Přidat položku
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => setShowDiscount(!showDiscount)}>
              <Percent className="h-4 w-4" /> Sleva z faktury
            </Button>
          </div>
        </div>

        {/* Discount */}
        {showDiscount && (
          <div className="bg-card border border-border/50 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium whitespace-nowrap">Sleva z faktury</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} className="w-24" min="0" max="100" />
                <span className="text-muted-foreground">%</span>
              </div>
              {discountAmount > 0 && <span className="text-sm text-muted-foreground">(−{discountAmount.toFixed(2)} Kč)</span>}
              <Button variant="ghost" size="icon" onClick={() => { setShowDiscount(false); setDiscountPercent(0) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-card border border-border/50 rounded-lg p-6">
          <div className="flex flex-col items-end space-y-4">
            {Object.entries(totals).map(([rate, values]) => (
              <div key={rate} className="grid grid-cols-3 gap-8 text-right min-w-[400px]">
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Sazba</div>
                  <div className="text-sm font-medium border-b-2 border-primary pb-1">{rate} %</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Základ</div>
                  <div className="text-sm font-medium">{values.base.toFixed(2)} Kč</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">DPH</div>
                  <div className="text-sm font-medium">{values.vat.toFixed(2)} Kč</div>
                </div>
              </div>
            ))}
            {discountPercent > 0 && (
              <div className="text-right min-w-[400px] pt-2 border-t border-border/50">
                <div className="text-sm text-muted-foreground">Sleva {discountPercent}%: −{discountAmount.toFixed(2)} Kč</div>
              </div>
            )}
            <div className="text-right min-w-[400px] pt-4 border-t border-border/50">
              <div className="text-3xl font-bold">{total.toFixed(2)} Kč</div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pb-10">
          <Button variant="outline" onClick={() => router.push(`/faktury/${invoiceId}`)} disabled={isLoading}>
            Zrušit
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ukládám...
              </>
            ) : (
              "Uložit změny"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
