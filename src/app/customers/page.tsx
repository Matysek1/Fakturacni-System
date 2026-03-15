"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Badge } from "~/components/ui/badge"
import { Input } from "~/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu"
import { Label } from "~/components/ui/label"
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash,
  Loader2,
} from "lucide-react"

import Navbar from "~/app/componenty/navbar"
import { api } from "~/trpc/react"
import { toast } from "sonner"

type CustomerForm = {
  name: string
  ico: string
  dic: string
  address: string
  mesto: string
  psc: string
  email: string
}

export default function CustomersPage() {
  const utils = api.useUtils()

  const customersQuery = api.customer.get.useQuery()

  const customerUpdate = api.customer.update.useMutation({
    onSuccess: async () => {
      await utils.customer.get.invalidate()
      toast.success("Zákazník byl úspěšně upraven.")
    },
    onError: () => {
      toast.error("Chyba při úpravě zákazníka.")
    },
  })

  const customerCreate = api.customer.create.useMutation({
    onSuccess: async () => {
      await utils.customer.get.invalidate()
      toast.success("Zákazník byl úspěšně vytvořen.")
    },
    onError: () => {
      toast.error("Chyba při vytváření zákazníka.")
    },
  })

  const customerDelete = api.customer.delete.useMutation({
    onSuccess: async () => {
      await utils.customer.get.invalidate()
      toast.success("Zákazník byl úspěšně smazán.")
    },
    onError: () => {
      toast.error("Chyba při mazání zákazníka. Zákazník má pravděpodobně navázané doklady.")
    },
  })

  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null)
  const [aresLoading, setAresLoading] = useState(false)
  const [aresError, setAresError] = useState<string | null>(null)

  const [form, setForm] = useState<CustomerForm>({
    name: "",
    ico: "",
    dic: "",
    address: "",
    mesto: "",
    psc: "",
    email: "",
  })

  // ✅ OPRAVENÝ FILTER
  const filteredCustomers = customersQuery.data?.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(search.toLowerCase()) ??
      customer.contact?.toLowerCase().includes(search.toLowerCase()) ??
      customer.ico?.includes(search)
    )
  })

  function openCreateDialog() {
    setEditingCustomerId(null)
    setAresError(null)
    setForm({
      name: "",
      ico: "",
      dic: "",
      address: "",
      mesto: "",
      psc: "",
      email: "",
    })
    setDialogOpen(true)
  }

  function openEditDialog(customer: { id: number; name: string; ico: string | null; dic: string | null; address: string | null; mesto: string | null; psc: string | null; contact: string | null }) {
    setEditingCustomerId(customer.id)
    setAresError(null)
    setForm({
      name: customer.name ?? "",
      ico: customer.ico ?? "",
      dic: customer.dic ?? "",
      address: customer.address ?? "",
      mesto: customer.mesto ?? "",
      psc: customer.psc ?? "",
      email: customer.contact ?? "",
    })
    setDialogOpen(true)
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
      toast.error("Zadejte název zákazníka.")
      return
    }
    if (form.email && !form.email.includes("@")) {
      toast.error("Zadejte platný email.")
      return
    }
    if (form.ico && form.ico.length !== 8) {
      toast.error("IČO musí mít 8 číslic.")
      return
    }
    if (form.psc && form.psc.length !== 5) {
      toast.error("PSČ musí mít 5 číslic.")
      return
    }

    if (editingCustomerId) {
      customerUpdate.mutate({
        id: editingCustomerId,
        name: form.name,
        ico: form.ico,
        dic: form.dic,
        address: form.address,
        mesto: form.mesto,
        psc: form.psc,
        contact: form.email,
      })
    } else {
      customerCreate.mutate({
        name: form.name,
        ico: form.ico,
        dic: form.dic,
        address: form.address,
        mesto: form.mesto,
        psc: form.psc,
        contact: form.email,
      })
    }

    setDialogOpen(false)
  }

  function handleDelete(id: number) {
    customerDelete.mutate({ id })
  }

  return (
    <div className="min-h-screen bg-blue-50/50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Zákazníci</h1>
            <p className="text-sm text-muted-foreground">
              Přehled odběratelů
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat…"
                className="pl-9 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Přidat zákazníka
            </Button>
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Seznam zákazníků</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>IČO</TableHead>
                  <TableHead>DIČ</TableHead>
                  <TableHead>Adresa</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Přidán</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredCustomers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>

                    <TableCell>{customer.ico ?? "—"}</TableCell>

                    <TableCell>
                      {customer.dic ? (
                        <Badge variant="secondary">{customer.dic}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell>{customer.address}</TableCell>
                    <TableCell>{customer.contact}</TableCell>
                    <TableCell>
                      {new Date(customer.createdAt).toLocaleDateString("cs-CZ")}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Pencil className="h-4 w-4" />
                            Upravit
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="gap-2 text-red-600"
                            onClick={() => handleDelete(customer.id)}
                          >
                            <Trash className="h-4 w-4" />
                            Smazat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCustomerId ? "Upravit zákazníka" : "Přidat zákazníka"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* IČO + ARES lookup */}
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
                  Načíst z ARES
                </Button>
              </div>
              {aresError && (
                <p className="text-sm text-red-500">{aresError}</p>
              )}
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
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
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
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="email@firma.cz"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSubmit}>Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}