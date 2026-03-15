"use client"

import { useState, useRef } from "react"
import { Button } from "../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog"
import { Sparkles, Upload, Loader2, FileText, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react"
import { api } from "~/trpc/react"
import { useRouter } from "next/navigation"

interface AIExtractedItem {
  description: string
  qty: number
  unit: string
  price: number
  vat: number
}

interface AIExtractedData {
  supplier?: {
    name?: string
    ico?: string
    dic?: string
    address?: string
  }
  invoiceNumber?: string
  issueDate?: string
  dueDate?: string
  description?: string
  items?: AIExtractedItem[]
  totalWithoutVat?: number
  totalVat?: number
  total?: number
}

type Step = "upload" | "loading" | "preview" | "saving" | "error"

export function AIExpenseImportDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("upload")
  const [extractedData, setExtractedData] = useState<AIExtractedData | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const saveExpense = api.expense.create.useMutation()

  const resetState = () => {
    setStep("upload")
    setExtractedData(null)
    setErrorMessage("")
    setDragOver(false)
  }

  const handleFile = async (file: File) => {
    setStep("loading")
    setErrorMessage("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/expense-ai", {
        method: "POST",
        body: formData,
      })

      const json = (await res.json()) as { success?: boolean; data?: AIExtractedData; error?: string }

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Nepodařilo se zpracovat soubor.")
      }

      setExtractedData(json.data ?? null)
      setStep("preview")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Neočekávaná chyba.")
      setStep("error")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  const handleSave = async () => {
    if (!extractedData) return
    setStep("saving")

    try {
      const items = (extractedData.items ?? []).map((item) => ({
        description: item.description || "Položka",
        qty: item.qty || 1,
        unit: item.unit || "ks",
        price: item.price || 0,
        vat: item.vat || 21,
      }))

      if (items.length === 0) {
        items.push({
          description: extractedData.description ?? "Náklad",
          qty: 1,
          unit: "ks",
          price: extractedData.total ?? 0,
          vat: 21,
        })
      }

      const total =
        extractedData.total ??
        items.reduce((sum, item) => {
          const base = item.qty * item.price
          return sum + base + base * (item.vat / 100)
        }, 0)

      const issueDate = extractedData.issueDate
        ? new Date(extractedData.issueDate)
        : new Date()

      const dueDate = extractedData.dueDate
        ? new Date(extractedData.dueDate)
        : new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000)

      const result = await saveExpense.mutateAsync({
        issueDate,
        dueDate,
        total,
        description: extractedData.description ?? undefined,
        statusId: 2,
        items,
      })

      setOpen(false)
      resetState()
      router.push(`/naklady/${result.id}`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Chyba při ukládání.")
      setStep("error")
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(amount)

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Přidat přes AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI import nákladu
          </DialogTitle>
          <DialogDescription>
            Nahrajte PDF nebo obrázek faktury a AI automaticky extrahuje data.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${dragOver ? "border-purple-500 bg-purple-50" : "border-border hover:border-purple-400 hover:bg-muted/30"}
            `}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
              className="hidden"
              onChange={handleInputChange}
            />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Přetáhněte soubor nebo klikněte</p>
            <p className="text-xs text-muted-foreground mt-1">
              Podporované formáty: PDF, PNG, JPEG, WebP
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-4 w-4" />
                PDF
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                Obrázek
              </div>
            </div>
          </div>
        )}

        {/* STEP: Loading */}
        {step === "loading" && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-purple-500 mb-4" />
            <p className="text-sm font-medium">AI analyzuje fakturu...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Toto může trvat několik sekund.
            </p>
          </div>
        )}

        {/* STEP: Preview */}
        {step === "preview" && extractedData && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Supplier */}
            {extractedData.supplier?.name && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Dodavatel</p>
                <p className="text-sm font-semibold">{extractedData.supplier.name}</p>
                {extractedData.supplier.ico && (
                  <p className="text-xs text-muted-foreground">IČO: {extractedData.supplier.ico}</p>
                )}
              </div>
            )}

            {/* Dates & Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Datum vystavení</p>
                <p className="text-sm font-medium">
                  {extractedData.issueDate
                    ? new Date(extractedData.issueDate).toLocaleDateString("cs-CZ")
                    : "—"}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Splatnost</p>
                <p className="text-sm font-medium">
                  {extractedData.dueDate
                    ? new Date(extractedData.dueDate).toLocaleDateString("cs-CZ")
                    : "—"}
                </p>
              </div>
            </div>

            {extractedData.description && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Popis</p>
                <p className="text-sm">{extractedData.description}</p>
              </div>
            )}

            {/* Items */}
            {extractedData.items && extractedData.items.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Položky</p>
                <div className="space-y-2">
                  {extractedData.items.map((item, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.qty} {item.unit} × {formatCurrency(item.price)} · DPH {item.vat}%
                        </p>
                      </div>
                      <p className="text-sm font-semibold ml-3 shrink-0">
                        {formatCurrency(item.qty * item.price * (1 + item.vat / 100))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 uppercase font-medium">Celkem s DPH</p>
                {extractedData.totalWithoutVat && (
                  <p className="text-xs text-muted-foreground">
                    Základ: {formatCurrency(extractedData.totalWithoutVat)} · DPH: {formatCurrency(extractedData.totalVat ?? 0)}
                  </p>
                )}
              </div>
              <p className="text-xl font-bold text-purple-700">
                {formatCurrency(extractedData.total ?? 0)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  resetState()
                }}
              >
                Zkusit znovu
              </Button>
              <Button
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white gap-2"
                onClick={() => void handleSave()}
              >
                <CheckCircle2 className="h-4 w-4" />
                Uložit náklad
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Saving */}
        {step === "saving" && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-purple-500 mb-4" />
            <p className="text-sm font-medium">Ukládám náklad...</p>
          </div>
        )}

        {/* STEP: Error */}
        {step === "error" && (
          <div className="py-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-red-500 mb-4" />
            <p className="text-sm font-medium text-red-600 mb-1">Chyba</p>
            <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => resetState()}
            >
              Zkusit znovu
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
