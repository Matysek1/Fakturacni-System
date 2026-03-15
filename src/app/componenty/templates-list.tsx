"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card } from "../../components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog"
import {
  Search,
  FileText,
  Loader2,
  Trash2,
  Copy,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { api } from "~/trpc/react"
import { useSession } from "next-auth/react"

type Template = {
  id: number
  name: string
  customer?: { name: string } | null
  items?: Array<{ qty: number; price: number; vat?: number | null }>
}

export function TemplatesList() {
  const { data: session } = useSession()
  const isAccountant = session?.user?.role === 2
  const [searchQuery, setSearchQuery] = useState("")

  const fetchTemplates = api.invoiceTemplate.get.useQuery()
  const deleteTemplate = api.invoiceTemplate.delete.useMutation({
    onSuccess: () => fetchTemplates.refetch(),
  })

  const allTemplates: Template[] = (fetchTemplates.data as Template[]) ?? []
  const isLoading = fetchTemplates.isLoading

  const filteredTemplates = allTemplates.filter((t: Template) => {
    return (
      searchQuery === "" ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customer?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(amount)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Šablony faktur</h1>
          <p className="text-muted-foreground mt-1">
            Uložené vzory pro rychlé vytváření faktur
          </p>
        </div>
        {!isAccountant && (
          <Button asChild>
            <Link href="/sablony/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nová šablona
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Copy className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Počet šablon</p>
            <p className="text-lg font-bold">{allTemplates.length}</p>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat šablony..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Název</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Klient</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Položek</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Celkem</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Akce</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Žádné šablony</p>
                      <p className="text-sm text-muted-foreground">
                        Šablonu vytvoříte při vystavování faktury tlačítkem &quot;Uložit jako šablonu&quot;
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((tpl: Template) => {
                  const total = (tpl.items ?? []).reduce(
                    (sum: number, item) => sum + item.qty * item.price * (1 + (item.vat ?? 0) / 100),
                    0
                  )
                  return (
                    <tr key={tpl.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium">{tpl.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{tpl.customer?.name ?? "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{tpl.items?.length ?? 0} položek</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{formatCurrency(total)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!isAccountant && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/faktury/nova?template=${tpl.id}`}>
                                <Copy className="mr-1 h-3.5 w-3.5" />
                                Vytvořit fakturu
                              </Link>
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Smazat šablonu?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Opravdu chcete smazat šablonu &quot;{tpl.name}&quot;? Tato akce je nevratná.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTemplate.mutate({ id: tpl.id })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Smazat
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
