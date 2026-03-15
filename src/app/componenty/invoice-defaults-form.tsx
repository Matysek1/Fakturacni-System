"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Card } from "../../components/ui/card"
import { ChevronLeft, Loader2, HelpCircle, Check } from "lucide-react"
import Link from "next/link"
import { api } from "~/trpc/react"
import { toast } from "sonner"

export default function InvoiceDefaultsForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [dueDays, setDueDays] = useState("14")
  const [invoiceType, setInvoiceType] = useState("faktura")
  const [vatRate, setVatRate] = useState(21)
  const [unit, setUnit] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("banka")
  const [currency, setCurrency] = useState("czk")
  const [language, setLanguage] = useState("cestina")
  const [vatCalculation, setVatCalculation] = useState("zakladu")

  const defaults = api.invoiceDefaults.get.useQuery()
  const upsertDefaults = api.invoiceDefaults.upsert.useMutation()

  useEffect(() => {
    if (!defaults.data) return
    const d = defaults.data
    setDueDays(d.dueDays.toString())
    setInvoiceType(d.invoiceType)
    setVatRate(d.vatRate)
    setUnit(d.unit)
    setPaymentMethod(d.paymentMethod)
    setCurrency(d.currency)
    setLanguage(d.language)
    setVatCalculation(d.vatCalculation)
  }, [defaults.data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSaved(false)

    try {
      await upsertDefaults.mutateAsync({
        dueDays: Number(dueDays),
        invoiceType,
        vatRate,
        unit,
        paymentMethod,
        currency,
        language,
        vatCalculation,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error("Error saving defaults:", error)
      toast.error("Chyba při ukládání nastavení!")
    } finally {
      setIsLoading(false)
    }
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

  if (defaults.isLoading && !defaults.error) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
          <Select value={dueDays} onValueChange={setDueDays}>
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
                variant={invoiceType === type.value ? "default" : "outline"}
                onClick={() => setInvoiceType(type.value)}
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
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
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
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
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
                variant={paymentMethod === method.value ? "default" : "outline"}
                onClick={() => setPaymentMethod(method.value)}
                className="flex-1 sm:flex-none min-w-[100px]"
              >
                {method.label}
              </Button>
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
                variant={vatCalculation === calc.value ? "default" : "outline"}
                onClick={() => setVatCalculation(calc.value)}
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
          <Select value={language} onValueChange={setLanguage}>
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
            <Select value={currency} onValueChange={setCurrency}>
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
      </Card>

      <div className="flex justify-center pt-4 pb-8">
        <Button
          type="submit"
          size="lg"
          className="min-w-[200px]"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Ukládám...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Uloženo!
            </>
          ) : (
            "Uložit nastavení"
          )}
        </Button>
      </div>
    </form>
  )
}
