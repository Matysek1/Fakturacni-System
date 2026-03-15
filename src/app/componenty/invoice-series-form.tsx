"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { cn } from "../../lib/utils"
import { api } from "~/trpc/react"
import { toast } from "sonner"

// Map between UI annualCount values and the number of digits stored in DB
// annualCount 100 → 3 digits, 1000 → 4 digits, etc.
function annualCountToDigits(count: number): number {
  return count.toString().length
}

function digitsToAnnualCount(digits: number): number {
  // 3 digits → 100, 4 → 1000, 5 → 10000, etc.
  return Math.pow(10, digits - 1)
}

type AnnualCount = 100 | 1000 | 10000 | 100000 | 1000000

export function InvoiceSeriesForm() {
  const [yearFormat, setYearFormat] = useState<"YYYY" | "YY" | "NONE">("YY")
  const [monthNumber, setMonthNumber] = useState<"yes" | "no">("no")
  const [sequentialPosition, setSequentialPosition] = useState<"START" | "END">("END")
  const [annualCount, setAnnualCount] = useState<AnnualCount>(1000)
  const [prefix, setPrefix] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const invoiceDefaults = api.company.getseries.useQuery()
  const editInvoiceDefaults = api.company.editSeries.useMutation()

  useEffect(() => {
    if (!invoiceDefaults.data) return

    const d = invoiceDefaults.data

    // yearFormat is stored as "YYYY", "YY", or "NONE" in DB
    const yf = d.yearFormat.toUpperCase()
    if (yf === "YYYY") setYearFormat("YYYY")
    else if (yf === "YY") setYearFormat("YY")
    else setYearFormat("NONE")

    setMonthNumber(d.includeMonth ? "yes" : "no")

    setSequentialPosition(
      d.sequencePosition.toUpperCase() === "START" ? "START" : "END"
    )

    // Convert DB digits back to annualCount for the UI
    const count = digitsToAnnualCount(d.digits) as AnnualCount
    // Clamp to valid values
    const validCounts: AnnualCount[] = [100, 1000, 10000, 100000, 1000000]
    setAnnualCount(validCounts.includes(count) ? count : 1000)

    setPrefix(d.prefix ?? "")
  }, [invoiceDefaults.data])

  const generatePreview = () => {
    const parts: string[] = []

    if (prefix) parts.push(prefix)

    if (sequentialPosition === "START") {
      const digits = annualCountToDigits(annualCount)
      parts.push("1".padStart(digits, "0"))
    }

    if (yearFormat === "YYYY") {
      parts.push(new Date().getFullYear().toString())
    } else if (yearFormat === "YY") {
      parts.push(new Date().getFullYear().toString().slice(-2))
    }

    if (monthNumber === "yes") {
      parts.push((new Date().getMonth() + 1).toString().padStart(2, "0"))
    }

    if (sequentialPosition === "END") {
      const digits = annualCountToDigits(annualCount)
      parts.push("1".padStart(digits, "0"))
    }

    return parts.join("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const invoiceDefaultsData = invoiceDefaults.data

      if (invoiceDefaultsData?.id) {
        await editInvoiceDefaults.mutateAsync({
          id: invoiceDefaultsData.id,
          yearFormat: yearFormat,
          includeMonth: monthNumber === "yes",
          sequencePosition: sequentialPosition,
          digits: annualCountToDigits(annualCount),
          prefix: prefix,
          currentNumber: invoiceDefaultsData.currentNumber ?? 0,
        })
      }

      toast.success("Nastavení číslování uloženo.")
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Neznámá chyba"
      console.error("Error saving invoice defaults:", errorMessage)
      toast.error("Chyba při ukládání nastavení!")
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
            {generatePreview()}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">Formát čísla roku</Label>
        <div className="flex flex-wrap gap-2">
          <OptionButton active={yearFormat === "YYYY"} onClick={() => setYearFormat("YYYY")}>
            {new Date().getFullYear()}
          </OptionButton>
          <OptionButton active={yearFormat === "YY"} onClick={() => setYearFormat("YY")}>
            {new Date().getFullYear().toString().slice(-2)}
          </OptionButton>
          <OptionButton active={yearFormat === "NONE"} onClick={() => setYearFormat("NONE")}>
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
            active={sequentialPosition === "START"}
            onClick={() => setSequentialPosition("START")}
          >
            Na začátku
          </OptionButton>
          <OptionButton
            active={sequentialPosition === "END"}
            onClick={() => setSequentialPosition("END")}
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
