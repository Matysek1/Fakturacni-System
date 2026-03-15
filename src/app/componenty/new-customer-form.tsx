"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog"
import { Search, Loader2 } from "lucide-react"

import { api } from "~/trpc/react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CustomerForm = {
  name: string
  ico: string
  dic: string
  address: string
  mesto: string
  psc: string
  email: string
}

export function CustomerDialog({ open, onOpenChange }: Props) {
  const utils = api.useUtils()

  const createCustomer = api.customer.create.useMutation({
    onSuccess: async () => {
      await utils.customer.get.invalidate()
      onOpenChange(false)
      resetForm()
    },
  })

  const [form, setForm] = useState<CustomerForm>({
    name: "",
    ico: "",
    dic: "",
    address: "",
    mesto: "",
    psc: "",
    email: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [aresLoading, setAresLoading] = useState(false)
  const [aresError, setAresError] = useState<string | null>(null)

  function resetForm() {
    setForm({ name: "", ico: "", dic: "", address: "", mesto: "", psc: "", email: "" })
    setError(null)
    setAresError(null)
  }

  async function handleAresLookup() {
    if (!form.ico.trim()) {
      setAresError("Zadejte IČO")
      return
    }

    setAresLoading(true)
    setAresError(null)

    try {
      const res = await fetch(`/api/ares?ico=${encodeURIComponent(form.ico.trim())}`)
      const data = (await res.json()) as { error?: string; name?: string; ico?: string; dic?: string; address?: string; mesto?: string; psc?: string }

      if (!res.ok) {
        setAresError(data.error ?? "Chyba při vyhledávání")
        return
      }

      setForm((prev) => ({
        ...prev,
        name: data.name ?? prev.name,
        ico: data.ico ?? prev.ico,
        dic: data.dic ?? prev.dic,
        address: data.address ?? prev.address,
        mesto: data.mesto ?? prev.mesto,
        psc: data.psc ?? prev.psc,
      }))
    } catch {
      setAresError("Nepodařilo se spojit s ARES")
    } finally {
      setAresLoading(false)
    }
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Zadejte název zákazníka.")
      return
    }
    if (form.email && !form.email.includes("@")) {
      setError("Zadejte platný email.")
      return
    }
    if (form.ico && form.ico.length !== 8) {
      setError("IČO musí mít 8 číslic.")
      return
    }
    if (form.psc && form.psc.length !== 5) {
      setError("PSČ musí mít 5 číslic.")
      return
    }

    createCustomer.mutate({
      name: form.name,
      ico: form.ico,
      dic: form.dic,
      address: form.address,
      mesto: form.mesto,
      psc: form.psc,
      contact: form.email,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Přidat zákazníka</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* IČO + ARES */}
          <div className="grid gap-2">
            <Label>IČO</Label>
            <div className="flex gap-2">
              <Input
                value={form.ico}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 8)
                  setForm({ ...form, ico: val })
                }}
                placeholder="Zadejte IČO (max 8 číslic)..."
                className="flex-1"
                maxLength={8}
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAresLookup}
                disabled={aresLoading || !form.ico.trim()}
                className="gap-2 shrink-0"
              >
                {aresLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                ARES
              </Button>
            </div>
            {aresError && <p className="text-sm text-red-500">{aresError}</p>}
          </div>

          <div className="grid gap-2">
            <Label>Název</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                const val = e.target.value.replace(/[0-9]/g, "")
                setForm({ ...form, name: val })
              }}
              placeholder="Název firmy / jméno..."
            />
          </div>

          <div className="grid gap-2">
            <Label>DIČ</Label>
            <Input
              value={form.dic}
              onChange={(e) => {
                const val = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12)
                setForm({ ...form, dic: val })
              }}
              placeholder="CZ12345678"
              maxLength={12}
            />
          </div>

          <div className="grid gap-2">
            <Label>Adresa</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Ulice a číslo popisné..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Město</Label>
              <Input
                value={form.mesto}
                onChange={(e) => {
                  const val = e.target.value.replace(/[0-9]/g, "")
                  setForm({ ...form, mesto: val })
                }}
                placeholder="Město..."
              />
            </div>
            <div className="grid gap-2">
              <Label>PSČ</Label>
              <Input
                value={form.psc}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 5)
                  setForm({ ...form, psc: val })
                }}
                placeholder="12345"
                maxLength={5}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@firma.cz"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSubmit} disabled={createCustomer.isPending}>
            {createCustomer.isPending ? "Ukládám..." : "Vytvořit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}