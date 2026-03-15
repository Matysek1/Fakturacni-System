"use client"

import { useState } from "react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Textarea } from "../../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Plus, X, ChevronLeft, Loader2, GripVertical, Percent } from "lucide-react"
import DashboardNavbar from "~/app/componenty/navbar"
import { api } from "~/trpc/react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

interface TemplateItem {
  id: string
  quantity: number
  unit: string
  description: string
  pricePerUnit: number
  vatRate: number
}

export default function NewTemplatePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("banka")
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [selectedDaysToDue, setSelectedDaysToDue] = useState(14)
  const [currency, setCurrency] = useState("czk")
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)

  const fetchCustomers = api.customer.get.useQuery()
  const saveTemplate = api.invoiceTemplate.create.useMutation()

  const [items, setItems] = useState<TemplateItem[]>([
    {
      id: "1",
      quantity: 1,
      unit: "ks",
      description: "",
      pricePerUnit: 0,
      vatRate: 21,
    },
  ])

  // Role guard
  if (session?.user.role === 2) {
    return (
      <div className="bg-blue-50/50">
        <DashboardNavbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-xl font-semibold">Nemáte oprávnění vytvářet šablony.</p>
        </div>
      </div>
    )
  }

  const addItem = () => {
    const newItem: TemplateItem = {
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

  const updateItem = (id: string, field: keyof TemplateItem, value: string | number) => {
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

    return { totals, totalBase, totalVat, total, discountAmount }
  }

  const { totals, total, discountAmount } = calculateTotals()

  const handleSubmit = async () => {
    if (!templateName.trim()) {
      toast.error("Zadejte název šablony.")
      return
    }
    if (items.some(i => !i.description.trim())) {
      toast.error("Vyplňte popis u všech položek.")
      return
    }

    setIsLoading(true)
    try {
      await saveTemplate.mutateAsync({
        name: templateName,
        customerId: selectedCustomer ? parseInt(selectedCustomer) : undefined,
        paymentMethod,
        currency,
        daysToDue: selectedDaysToDue,
        discount: discountPercent,
        invoiceType: "faktura",
        items: items.map((i) => ({
          description: i.description,
          qty: i.quantity,
          price: i.pricePerUnit,
          vat: i.vatRate,
          unit: i.unit,
        })),
      })
      toast.success("Šablona byla úspěšně uložena.")
      router.push("/sablony")
    } catch (error) {
      console.error("Error saving template:", error)
      toast.error("Chyba při ukládání šablony.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-blue-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        <DashboardNavbar />
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Nová šablona</h1>
          <Button variant="outline" asChild>
            <a href="/sablony">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Zpět
            </a>
          </Button>
        </div>

        {/* Template Name */}
        <div className="bg-card border border-border/50 rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
            <Label className="text-sm font-medium">Název šablony</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Např. Měsíční faktura za služby..."
              className="max-w-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
            <Label className="text-sm font-medium pt-2">Odběratel</Label>
            <div className="flex gap-2">
              <Select value={selectedCustomer ?? undefined} onValueChange={(key) => setSelectedCustomer(key)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Vyberte odběratele (volitelné)..." />
                </SelectTrigger>
                <SelectContent>
                  {fetchCustomers.data?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
            <Label className="text-sm font-medium">Měna</Label>
            <Select value={currency} onValueChange={setCurrency}>
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={() => setShowDiscount(!showDiscount)}
            >
              <Percent className="h-4 w-4" />
              Sleva z faktury
            </Button>
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
        <div className="flex items-center justify-end gap-3 pb-10">
          <Button variant="outline" onClick={() => router.push("/sablony")} disabled={isLoading}>
            Zrušit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ukládám...
              </>
            ) : (
              "Uložit šablonu"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
