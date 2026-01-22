"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Switch } from "../../components/ui/switch"
import { Checkbox } from "../../components/ui/checkbox"
import { Card } from "../../components/ui/card"
import { ChevronLeft, Loader2, HelpCircle } from "lucide-react"
import Link from "next/link"

interface InvoiceDefaults {
  dueDate: string
  invoiceType: "proforma" | "faktura"
  vatRate: string
  unit: string
  paymentMethod: "banka" | "kartou" | "hotove" | "dobirka" | "jina"
  hidePaymentDetails: {
    kartou: boolean
    hotove: boolean
    dobirka: boolean
    paypal: boolean
    jina: boolean
  }
  vatCalculation: "zakladu" | "konecne"
  language: string
  currency: string
  fixedRate: boolean
  customerInvoices: boolean
}

export default function InvoiceDefaultsForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<InvoiceDefaults>({
    dueDate: "14",
    invoiceType: "faktura",
    vatRate: "21",
    unit: "",
    paymentMethod: "banka",
    hidePaymentDetails: {
      kartou: false,
      hotove: false,
      dobirka: false,
      paypal: false,
      jina: false,
    },
    vatCalculation: "zakladu",
    language: "cestina",
    currency: "czk",
    fixedRate: false,
    customerInvoices: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log("Invoice defaults saved:", formData)
    setIsLoading(false)
  }

  const paymentMethods = [
    { value: "banka", label: "Banka" },
    { value: "kartou", label: "Kartou" },
    { value: "hotove", label: "Hotově" },
    { value: "dobirka", label: "Dobírka" },
    { value: "jina", label: "Jiná" },
  ]

  const vatCalculations = [
    { value: "zakladu", label: "Základu" },
    { value: "konecne", label: "Konc. částky" },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Výchozí hodnoty na faktuře</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Zpět
          </Link>
        </Button>
      </div>

      <Card className="p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <Label htmlFor="dueDate" className="text-base">
            Splatnost
          </Label>
          <Select value={formData.dueDate} onValueChange={(value) => setFormData({ ...formData, dueDate: value })}>
            <SelectTrigger id="dueDate" className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dní</SelectItem>
              <SelectItem value="14">14 dní</SelectItem>
              <SelectItem value="21">21 dní</SelectItem>
              <SelectItem value="30">30 dní</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <Label className="text-base">Výchozí typ faktur</Label>
          <div className="flex gap-2">
            {[
              { value: "proforma", label: "Proforma" },
              { value: "faktura", label: "Faktura" },
            ].map((type) => (
              <Button
                key={type.value}
                type="button"
                variant={formData.invoiceType === type.value ? "default" : "outline"}
                onClick={() => setFormData({ ...formData, invoiceType: type.value as "proforma" | "faktura" })}
                className="flex-1 sm:flex-none"
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <Label htmlFor="vatRate" className="text-base">
            Sazba DPH
          </Label>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              id="vatRate"
              type="number"
              value={formData.vatRate}
              onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
              className="w-24"
              disabled={isLoading}
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
          <Label htmlFor="unit" className="text-base pt-2">
            Měrná jednotka (ks, hod, ...)
          </Label>
          <div className="space-y-2">
            <Input
              id="unit"
              placeholder=""
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full sm:w-[300px]"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">Nechcete-li předvyplňovat, nechte prázdné.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <Label className="text-base">Platební metoda</Label>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((method) => (
              <Button
                key={method.value}
                type="button"
                variant={formData.paymentMethod === method.value ? "default" : "outline"}
                onClick={() =>
                  setFormData({
                    ...formData,
                    paymentMethod: method.value as InvoiceDefaults["paymentMethod"],
                  })
                }
                className="flex-1 sm:flex-none min-w-[100px]"
              >
                {method.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
          <Label className="text-base pt-2">Schovat bank. údaje pro platbu</Label>
          <div className="space-y-3">
            {Object.entries({
              kartou: "Kartou",
              hotove: "Hotově",
              dobirka: "Dobírka",
              paypal: "PayPal",
              jina: "Jiná",
            }).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`hide-${key}`}
                  checked={formData.hidePaymentDetails[key as keyof typeof formData.hidePaymentDetails]}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      hidePaymentDetails: {
                        ...formData.hidePaymentDetails,
                        [key]: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor={`hide-${key}`} className="text-sm font-normal cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <Label className="text-base">DPH počítat ze</Label>
          <div className="flex gap-2 items-center">
            {vatCalculations.map((calc) => (
              <Button
                key={calc.value}
                type="button"
                variant={formData.vatCalculation === calc.value ? "default" : "outline"}
                onClick={() =>
                  setFormData({
                    ...formData,
                    vatCalculation: calc.value as "zakladu" | "konecne",
                  })
                }
                className="flex-1 sm:flex-none min-w-[120px]"
              >
                {calc.label}
              </Button>
            ))}
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <Label htmlFor="language" className="text-base">
            Jazyk faktury
          </Label>
          <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
            <SelectTrigger id="language" className="w-full sm:w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cestina">Čeština</SelectItem>
              <SelectItem value="anglictina">Angličtina</SelectItem>
              <SelectItem value="nemcina">Němčina</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
          <Label htmlFor="currency" className="text-base pt-2">
            Měna
          </Label>
          <div className="space-y-2">
            <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
              <SelectTrigger id="currency" className="w-full sm:w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="czk">CZK - Česká republika</SelectItem>
                <SelectItem value="eur">EUR - Euro</SelectItem>
                <SelectItem value="usd">USD - Americký dolar</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Pro statistiky slouží CZK.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <Label className="text-base">Fixní kurz</Label>
          <div className="flex items-center gap-4">
            <Switch
              checked={formData.fixedRate}
              onCheckedChange={(checked) => setFormData({ ...formData, fixedRate: checked })}
            />
            <Link href="#" className="text-sm text-primary hover:underline">
              Vlastní kurzy
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <Label className="text-base">Faktury vystavené odběratelům</Label>
          <div className="flex items-center gap-4">
            <Switch
              checked={formData.customerInvoices}
              onCheckedChange={(checked) => setFormData({ ...formData, customerInvoices: checked })}
            />
            <Link href="#" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Více informací...
            </Link>
          </div>
        </div>
      </Card>

      <div className="flex justify-center pt-4">
        <Button
          type="submit"
          size="lg"
          className="min-w-[200px] bg-[hsl(var(--chart-1))] hover:bg-[hsl(var(--chart-1))]/90"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Ukládám...
            </>
          ) : (
            "Uložit"
          )}
        </Button>
      </div>
    </form>
  )
}
