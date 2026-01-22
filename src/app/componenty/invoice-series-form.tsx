"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { cn } from "../../lib/utils"
import { api } from "~/trpc/react"
import { date } from "zod"

export function InvoiceSeriesForm() {
  const [yearFormat, setYearFormat] = useState<"yyyy" | "yy" | "none">("yy")
  const [monthNumber, setMonthNumber] = useState<"yes" | "no">("no")
  const [sequentialPosition, setSequentialPosition] = useState<"start" | "end">("end")
  const [annualCount, setAnnualCount] =
    useState<100 | 1000 | 10000 | 100000 | 1000000>(1000)
  const [prefix, setPrefix] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const invoiceDefaults = api.company.getseries.useQuery()
  const editInvoiceDefaults = api.company.editSeries.useMutation()

  useEffect(() => {
    if (!invoiceDefaults.data) return

    const d = invoiceDefaults.data

    setYearFormat(
      d.yearFormat === new Date().getFullYear().toString()
        ? "yyyy"
        : d.yearFormat === new Date().getFullYear().toString().slice(-2)
        ? "yy"
        : "none"
    )

    setMonthNumber(d.includeMonth ? "yes" : "no")

    setSequentialPosition(
      d.sequencePosition === "START" ? "start" : "end"
    )

    setAnnualCount(digitsToAnnualCount(d.digits) as typeof annualCount)


    setPrefix(d.prefix ?? "")
  }, [invoiceDefaults.data])

  const generatePreview = () => {
    let preview = "Faktura "
    const parts: string[] = []

    if (prefix) parts.push(prefix)

    if (yearFormat !== "none") {
      if (yearFormat === "yyyy") {
        const fullYear = new Date().getFullYear().toString()
        parts.push(fullYear)
      } else if (yearFormat === "yy") {
        const shortYear = new Date().getFullYear().toString().slice(-2)
        parts.push(shortYear)
      }
    }

    if (monthNumber === "yes") {
      parts.push("01")
    }

    const digits = annualCount.toString().length
    const sequentialNumber = "1".padStart(digits, "0")

    if (sequentialPosition === "start") {
      parts.unshift(sequentialNumber)
    } else {
      parts.push(sequentialNumber)
    }

    preview += parts.join("")

    return preview
  }

  function toDigits(value: number): number {
  return value.toString().length
  }

  function digitsToAnnualCount(digits: number): number {
  return Math.pow(10, digits)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const invoiceDefaultsData = invoiceDefaults.data

      if (invoiceDefaultsData?.id) {
        console.log(yearFormat);
        await editInvoiceDefaults.mutateAsync({
          id: invoiceDefaultsData.id,
          yearFormat: yearFormat,
          includeMonth: monthNumber === "yes",
          sequencePosition: sequentialPosition,
          digits: toDigits(annualCount),
          prefix: prefix,
          currentNumber: invoiceDefaultsData.currentNumber ?? 0,
        })
      }

      alert("Nastavení uloženo!")
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Neznámá chyba"
      console.error("Error saving invoice defaults:", errorMessage)
      alert("Chyba při ukládání nastavení!")
    } finally {
      setIsLoading(false)
    }
  }

  const OptionButton = ({
    active,
    onClick,
    children,
  }: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-md border text-sm font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  )

  if (invoiceDefaults.isLoading) {
    return <div>Načítání nastavení…</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-card p-6 rounded-xl border">
      <div className="flex items-center justify-center py-6 border-b border-border">
        <div className="text-2xl font-semibold">
          <span className="text-muted-foreground">Faktura </span>
          <span className="text-primary">
            {generatePreview().replace("Faktura ", "")}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Formát čísla roku</Label>
        <div className="flex flex-wrap gap-2">
          <OptionButton active={yearFormat === "yyyy"} onClick={() => setYearFormat("yyyy")}>
            {new Date().getFullYear()}
          </OptionButton>
          <OptionButton active={yearFormat === "yy"} onClick={() => setYearFormat("yy")}>
            {new Date().getFullYear().toString().slice(-2)}
          </OptionButton>
          <OptionButton active={yearFormat === "none"} onClick={() => setYearFormat("none")}>
            Nechci
          </OptionButton>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Číslo měsíce</Label>
        <div className="flex gap-2">
          <OptionButton active={monthNumber === "yes"} onClick={() => setMonthNumber("yes")}>
            Ano
          </OptionButton>
          <OptionButton active={monthNumber === "no"} onClick={() => setMonthNumber("no")}>
            Ne
          </OptionButton>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Pořadové číslo</Label>
        <div className="flex gap-2">
          <OptionButton
            active={sequentialPosition === "start"}
            onClick={() => setSequentialPosition("start")}
          >
            Na začátku
          </OptionButton>
          <OptionButton
            active={sequentialPosition === "end"}
            onClick={() => setSequentialPosition("end")}
          >
            Na konci
          </OptionButton>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Počet faktur ročně</Label>
        <div className="flex flex-wrap gap-2">
          <OptionButton active={annualCount === 100} onClick={() => setAnnualCount(100)}>
            100
          </OptionButton>
          <OptionButton active={annualCount === 1000} onClick={() => setAnnualCount(1000)}>
            1 000
          </OptionButton>
          <OptionButton active={annualCount === 10000} onClick={() => setAnnualCount(10000)}>
            10 000
          </OptionButton>
          <OptionButton active={annualCount === 100000} onClick={() => setAnnualCount(100000)}>
            100 000
          </OptionButton>
          <OptionButton
            active={annualCount === 1000000}
            onClick={() => setAnnualCount(1000000)}
          >
            1 mil.
          </OptionButton>
        </div>
        <p className="text-sm text-muted-foreground">
          Nastavení počtu míst pořadového čísla.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="prefix" className="text-base font-medium">
          Předpona
        </Label>
        <Input
          id="prefix"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="Např. FAK"
          className="max-w-xs"
        />
      </div>

      <div className="pt-4">
        <Button type="submit" size="lg" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? "Ukládání..." : "Uložit"}
        </Button>
      </div>
    </form>
  )
}
