"use client"

import { useState, useEffect, Suspense } from "react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Calendar } from "../../../components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover"
import { cn } from "~/lib/utils"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { CalendarIcon, Plus, X, ChevronLeft, Loader2, GripVertical, Percent } from "lucide-react"
import  DashboardNavbar  from "~/app/componenty/navbar"
import {api} from "~/trpc/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { CustomerDialog } from "~/app/componenty/new-customer-form"
import { toast } from "sonner"


interface InvoiceItem {
  id: string
  quantity: number
  unit: string
  description: string
  pricePerUnit: number
  vatRate: number
}

type Template = {
  id: number
  name: string
  customerId?: number | null
  paymentMethod: string
  currency: string
  daysToDue: number
  discount?: number | null
  invoiceType: string
  items?: Array<{
    id: number
    description: string
    qty: number
    unit?: string | null
    price: number
    vat?: number | null
  }>
}


function NewInvoiceForm() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("faktura")
  const [isLoading, setIsLoading] = useState(false)
  const [issueDate, setIssueDate] = useState<Date>(new Date())
  const [taxableDate, setTaxableDate] = useState<Date>(new Date())
  const [paymentMethod, setPaymentMethod] = useState("banka")
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [selectedDaysToDue, setSelectedDaysToDue] = useState(14)
  const [currency, setCurrency] = useState("czk")
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const fetchCustomers = api.customer.get.useQuery();
  const router = useRouter();

  const previewInvoiceNumber = api.invoiceNumbering.preview.useQuery();
  const saveInvoice = api.invoice.create.useMutation();
  const invoiceDefaults = api.invoiceDefaults.get.useQuery();
  const companyQuery = api.company.get.useQuery();

  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get("template");
  const templateId = templateIdParam ? parseInt(templateIdParam) : undefined;
  const templateQuery = api.invoiceTemplate.getById.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  const saveTemplate = api.invoiceTemplate.create.useMutation();
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [defaultVatRate, setDefaultVatRate] = useState(21)
  const [defaultUnit, setDefaultUnit] = useState("ks")

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

  // Load defaults when they arrive from DB
  useEffect(() => {
    if (!invoiceDefaults.data) return
    const d = invoiceDefaults.data

    setSelectedDaysToDue(d.dueDays)
    setPaymentMethod(d.paymentMethod)
    setCurrency(d.currency)
    setActiveTab(d.invoiceType === "proforma" ? "zalohovka" : "faktura")
    setDefaultVatRate(d.vatRate)
    setDefaultUnit(d.unit || "ks")

    // Update existing items with defaults
    setItems(prev => prev.map(item => ({
      ...item,
      unit: d.unit || "ks",
      vatRate: d.vatRate,
    })))
  }, [invoiceDefaults.data])

  // Load template when it arrives
  useEffect(() => {
    if (!templateQuery.data) return
    const t = templateQuery.data as unknown as Template

    if (t.customerId) setSelectedCustomer(t.customerId.toString())
    setPaymentMethod(t.paymentMethod)
    setCurrency(t.currency)
    setSelectedDaysToDue(t.daysToDue)
    setActiveTab(t.invoiceType)
    if (t.discount) setDiscountPercent(t.discount)

    if (t.items && t.items.length > 0) {
      setItems(t.items.map(item => ({
        id: Math.random().toString(),
        quantity: item.qty,
        unit: item.unit ?? "ks",
        description: item.description,
        pricePerUnit: item.price,
        vatRate: item.vat ?? 21,
      })))
    }
  }, [templateQuery.data])

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
            <p className="text-muted-foreground">Před vytvořením faktury musíte vyplnit údaje o vaší firmě (název, IČO, adresa, bankovní účet).</p>
          </div>
          <Button asChild>
            <Link href="/nastaveni">Přejít do nastavení</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Role guard — účetní nemůže vystavovat faktury
  if (session?.user.role === 2) {
    return (
      <div className="bg-blue-50/50">
        <DashboardNavbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-xl font-semibold">Nemáte oprávnění vystavovat faktury.</p>
        </div>
      </div>
    );
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      quantity: 1,
      unit: defaultUnit,
      description: "",
      pricePerUnit: 0,
      vatRate: defaultVatRate,
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
    due.setDate(due.getDate() + selectedDaysToDue)
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
    let total = totalBase + totalVat

    // Apply discount
    const discountAmount = total * (discountPercent / 100)
    total = total - discountAmount

    return { totals, totalBase, totalVat, total, discountAmount }
  }

  const { totals, totalBase, totalVat, total, discountAmount } = calculateTotals()

  const handleSubmit = async (type: "draft" | "create") => {
    // Validace pro vytvoření faktury (koncepty mohou být neúplné)
    if (type === "create") {
      if (!selectedCustomer) {
        toast.error("Vyberte odběratele.")
        return
      }
      if (!previewInvoiceNumber.data?.invoiceNumber) {
        toast.error("Číslo faktury není dostupné.")
        return
      }
      const emptyDescriptions = items.filter(i => !i.description.trim())
      if (emptyDescriptions.length > 0) {
        toast.error("Vyplňte popis u všech položek.")
        return
      }
      const zeroPriceItems = items.filter(i => i.pricePerUnit <= 0)
      if (zeroPriceItems.length > 0) {
        toast.error("Zadejte cenu u všech položek.")
        return
      }
      const zeroQtyItems = items.filter(i => i.quantity <= 0)
      if (zeroQtyItems.length > 0) {
        toast.error("Zadejte počet u všech položek.")
        return
      }
    }

    setIsLoading(true)
    try {
      // statusId: 1 = koncept (draft), 2 = ceka (pending)
      const statusId = type === "draft" ? 1 : 2

      await saveInvoice.mutateAsync({
        id: previewInvoiceNumber.data?.invoiceNumber ?? "",
        customerId: selectedCustomer ? parseInt(selectedCustomer) : fetchCustomers.data?.[0]?.id ?? 0,
        issueDate,
        dueDate: new Date(issueDate.getTime() + selectedDaysToDue * 24 * 60 * 60 * 1000),
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
      toast.success("Faktura byla úspěšně vytvořena.")
      router.push('/faktury');
    } catch (error) {
      console.error("Error saving invoice:", error)
      toast.error("Chyba při vytváření faktury.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateName) return;
    setIsLoading(true);
    try {
      await saveTemplate.mutateAsync({
        name: templateName,
        customerId: selectedCustomer ? parseInt(selectedCustomer) : undefined,
        paymentMethod,
        currency,
        daysToDue: selectedDaysToDue,
        discount: discountPercent,
        invoiceType: activeTab,
        items: items.map(i => ({
          description: i.description,
          qty: i.quantity,
          price: i.pricePerUnit,
          vat: i.vatRate,
          unit: i.unit,
        }))
      });
      setIsSavingTemplate(false);
      setTemplateName("");
      toast.success("Šablona byla úspěšně uložena.");
    } catch (e) {
      console.error(e);
      toast.error("Chyba při ukládání šablony.");
    } finally {
      setIsLoading(false);
    }
  };

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
                <Button variant="outline" size="icon" className="shrink-0 bg-transparent" onClick={() => setCustomerDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-sm font-medium">Číslo faktury</Label>
              <div className="flex items-center gap-2">
                <Input value={previewInvoiceNumber.data?.invoiceNumber ?? ""} readOnly className="max-w-[200px]" />
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
                {[
                  { value: "banka", label: "Banka" },
                  { value: "kartou", label: "Kartou" },
                  { value: "hotove", label: "Hotově" },
                  { value: "dobirka", label: "Dobírka" },
                  { value: "jina", label: "Jiná" },
                ].map((method) => (
                  <Button
                    key={method.value}
                    type="button"
                    variant={paymentMethod === method.value ? "default" : "outline"}
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    {method.label}
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
                    <SelectItem value="21">21 dní</SelectItem>
                    <SelectItem value="30">30 dní</SelectItem>
                    <SelectItem value="60">60 dní</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">(vychází na {calculateDueDate()})</span>
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
                      <td className="p-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      </td>
                      <td className="p-3">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "")
                            updateItem(item.id, "quantity", val === "" ? 0 : Number(val))
                          }}
                          onFocus={(e) => {
                            if (e.target.value === "0") e.target.value = ""
                          }}
                          className="w-20"
                          min="0"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.unit}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[0-9]/g, "").slice(0, 5)
                            updateItem(item.id, "unit", val)
                          }}
                          placeholder="ks"
                          className="w-20"
                          maxLength={5}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="Popis položky..."
                          className="w-full min-w-[250px]"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={item.pricePerUnit}
                          onChange={(e) => updateItem(item.id, "pricePerUnit", Number(e.target.value))}
                          onFocus={(e) => {
                            if (Number(e.target.value) === 0) e.target.value = ""
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") updateItem(item.id, "pricePerUnit", 0)
                          }}
                          className="w-32"
                          min="0"
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
                onClick={() => setShowDiscount(!showDiscount)}
              >
                <Percent className="h-4 w-4" />
                Sleva z faktury
              </Button>
              <div className="ml-auto text-sm text-muted-foreground">
                DPH počítám ze <span className="text-primary font-medium">Základu</span>.{" "}
              </div>
            </div>
          </div>

          {/* Discount Row */}
          {showDiscount && (
            <div className="bg-card border border-border/50 rounded-lg p-6">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium whitespace-nowrap">Sleva z faktury</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-24"
                    min="0"
                    max="100"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                {discountAmount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    (−{discountAmount.toFixed(2)} Kč)
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setShowDiscount(false); setDiscountPercent(0) }}
                >
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-10">
            <div className="flex self-start sm:self-auto gap-2">
              {isSavingTemplate ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Název šablony"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-48"
                  />
                  <Button variant="outline" onClick={() => setIsSavingTemplate(false)}>
                    Zrušit
                  </Button>
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={!templateName || isLoading}
                  >
                    Uložit
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setIsSavingTemplate(true)} disabled={isLoading}>
                  Uložit jako šablonu
                </Button>
              )}
            </div>
            
            <div className="flex w-full sm:w-auto items-center justify-end gap-3">
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
    <CustomerDialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen} />
    </div>
  )
}


export default function Page() {
  return (
  <Suspense fallback={<div>Načítání...</div>}>
    <NewInvoiceForm />
  </Suspense>  
  )
}