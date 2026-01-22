"use client"

import { useState } from "react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Textarea } from "../../../components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Calendar } from "../../../components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover"
import { cn } from "~/lib/utils"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { CalendarIcon, Plus, X, ChevronLeft, Loader2, GripVertical } from "lucide-react"
import  DashboardNavbar  from "~/app/componenty/navbar"
import {api} from "~/trpc/react"
import { useRouter } from "next/navigation"


interface InvoiceItem {
  id: string
  quantity: number
  unit: string
  description: string
  pricePerUnit: number
  vatRate: number
}

export default function NewInvoiceForm() {
  const [activeTab, setActiveTab] = useState("faktura")
  const [isLoading, setIsLoading] = useState(false)
  const [issueDate, setIssueDate] = useState<Date>(new Date())
  const [taxableDate, setTaxableDate] = useState<Date>(new Date())
  const [paymentMethod, setPaymentMethod] = useState("banka")
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [selectedDaysToDue, setSelectedDaysToDue] = useState(14)
  const fetchCustomers = api.customer.get.useQuery();
  const router = useRouter();

  const previewInvoiceNumber = api.invoiceNumbering.preview.useQuery();
  const saveInvoice = api.invoice.create.useMutation();
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      quantity: 1,
      unit: "ks",
      description: "",
      pricePerUnit: 0,
      vatRate: 21,
    },
  ])

  const addItem = () => {
    const newItem: InvoiceItem = {
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

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

const calculateDueDate = (): string => {
  const due = new Date(issueDate)
  due.setDate(due.getDate() + 14)
  return format(due, "d. M. yyyy", { locale: cs })
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
    const total = totalBase + totalVat

    return { totals, totalBase, totalVat, total }
  }

  const { totals, totalBase, totalVat, total } = calculateTotals()

  const handleSubmit = async (type: "draft" | "create") => {
    setIsLoading(true)
    console.log(selectedCustomer);
    await saveInvoice.mutateAsync({
      id: previewInvoiceNumber.data?.invoiceNumber ?? "",
      customerId: selectedCustomer ? parseInt(selectedCustomer) : fetchCustomers.data?.[0]?.id ?? 0,
      issueDate,
      dueDate: new Date(issueDate.getTime() + selectedDaysToDue * 24 * 60 * 60 * 1000),
      duzpDate: taxableDate,
      total,
      status: type === "draft" ? "DRAFT" : "NEW",
      items: items.map((item) => ({
        description: item.description,
        qty: item.quantity,
        unit: item.unit,
        price: item.pricePerUnit,
        vat: item.vatRate,
      })),
    })



    console.log("Invoice submitted:", { type, items })
    setIsLoading(false)
    router.push('/faktury');
  }

  return (
    <div className="bg-blue-50/50">
    <div className="max-w-7xl mx-auto space-y-6">
      <DashboardNavbar/>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Nová faktura</h1>
        <Button variant="outline" asChild>
          <a href="/dashboard">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Zpět
          </a>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="faktura">Faktura</TabsTrigger>
          <TabsTrigger value="zalohovka">Zálohovka</TabsTrigger>
          <TabsTrigger value="zuctovaci">Zúčtovací</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          <div className="bg-card border border-border/50 rounded-lg p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
              <Label className="text-sm font-medium pt-2">Odběratel</Label>
              <div className="flex gap-2">
                <Select value={selectedCustomer ?? undefined} onValueChange={(key) => setSelectedCustomer(key)}>
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
                <Button variant="outline" size="icon" className="shrink-0 bg-transparent">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-sm font-medium">Číslo faktury</Label>
              <div className="flex items-center gap-2">
                <Input value={previewInvoiceNumber.data?.invoiceNumber ?? ""} readOnly className="max-w-[200px]" />
                <Button variant="link" className="text-primary">
                  Změnit
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
                <Label className="text-sm font-medium">Datum vystavení</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !issueDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {issueDate ? format(issueDate, "d.M.yyyy") : "Vyberte datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={issueDate} onSelect={(date: Date | undefined) => date instanceof Date && setIssueDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
                <Label className="text-sm font-medium">Zdanitelné plnění</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !taxableDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {taxableDate ? format(taxableDate, "d.M.yyyy") : "Vyberte datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={taxableDate} onSelect={(date: Date | undefined) => date instanceof Date && setTaxableDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-sm font-medium">Platební metoda</Label>
              <div className="flex flex-wrap gap-2">
                {["banka", "kartou", "hotove", "dobirka", "jina"].map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant={paymentMethod === method ? "default" : "outline"}
                    onClick={() => setPaymentMethod(method)}
                    className="capitalize"
                  >
                    {method === "banka" && "Banka"}
                    {method === "kartou" && "Kartou"}
                    {method === "hotove" && "Hotově"}
                    {method === "dobirka" && "Dobírka"}
                    {method === "jina" && "Jiná"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-sm font-medium">Splatnost</Label>
              <div className="flex items-center gap-2">
                <Select value={selectedDaysToDue.toString()} onValueChange={(value) => setSelectedDaysToDue(Number(value))}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dní</SelectItem>
                    <SelectItem value="14">14 dní</SelectItem>
                    <SelectItem value="30">30 dní</SelectItem>
                    <SelectItem value="60">60 dní</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">(vychází na {calculateDueDate()})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-sm font-medium">Měna</Label>
              <Select defaultValue="czk">
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="czk">CZK</SelectItem>
                  <SelectItem value="eur">EUR</SelectItem>
                  <SelectItem value="usd">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Další možnosti
              </Button>
            </div>
          </div>

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
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-b border-border/50 last:border-0">
                      <td className="p-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="w-20"
                          min="0"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                          placeholder="ks..."
                          className="w-20"
                        />
                      </td>
                      <td className="p-3">
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="Popis položky..."
                          className="min-h-[60px]"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={item.pricePerUnit}
                          onChange={(e) => updateItem(item.id, "pricePerUnit", Number(e.target.value))}
                          className="w-32"
                        />
                      </td>
                      <td className="p-3">
                        <Select
                          value={item.vatRate.toString()}
                          onValueChange={(value) => updateItem(item.id, "vatRate", Number(value))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0</SelectItem>
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="21">21</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
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
                <Plus className="h-4 w-4" />
                Přidat položku
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                Sleva z faktury
              </Button>
              <div className="ml-auto text-sm text-muted-foreground">
                DPH počítám ze <span className="text-primary font-medium">Základu</span>.{" "}
                <Button variant="link" className="h-auto p-0 text-sm">
                  Změnit
                </Button>
              </div>
            </div>
          </div>

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

              <div className="text-right min-w-[400px] pt-4 border-t border-border/50">
                <div className="text-3xl font-bold">{total.toFixed(2)} Kč</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pb-10">
            <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={isLoading}>
              Uložit jako koncept
            </Button>
            <Button variant="outline" disabled={isLoading}>
              Zobrazit náhled
            </Button>
            <Button
              onClick={() => handleSubmit("create")}
              disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vytvářím...
                </>
              ) : (
                "Vytvořit fakturu"
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </div>
  )
}
