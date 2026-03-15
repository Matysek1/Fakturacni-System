"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card } from "../../components/ui/card"
import {
  Search,
  FileText,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { api } from "~/trpc/react"
import { useSession } from "next-auth/react"

export function CreditNotesList() {
  const { data: session } = useSession()
  const isAccountant = session?.user?.role === 2
  const [searchQuery, setSearchQuery] = useState("")

  const fetchCreditNotes = api.creditNote.get.useQuery({})
  const allCreditNotes: {
    id: string
    invoiceId: string
    customerId: number
    userId: string
    issueDate: Date
    duzpDate: Date
    total: number
    reason: string | null
    createdAt: Date
    updatedAt: Date
    customer: { name: string } | null
    invoice: { id: string; total: number }
  }[] = (fetchCreditNotes.data as typeof allCreditNotes) ?? []
  const isLoading = fetchCreditNotes.isLoading

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("cs-CZ")
  }

  // Filter
  const filteredNotes = allCreditNotes.filter((note) => {
    return (
      searchQuery === "" ||
      note.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.customer?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.reason ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const totalAmount = allCreditNotes.reduce((sum, cn) => sum + cn.total, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opravné daňové doklady</h1>
          <p className="text-muted-foreground mt-1">Přehled vystavených opravných daňových dokladů</p>
        </div>
        {!isAccountant && (
          <Button asChild>
            <Link href="/dobropisy/novy">
              <FileText className="mr-2 h-4 w-4" />
              Nový opravný doklad
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Celková hodnota opravných dokladů</p>
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Počet opravných dokladů</p>
              <p className="text-lg font-bold">{allCreditNotes.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat opravné doklady..."
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
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Číslo</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">K faktuře</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Klient</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Důvod</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Částka</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Vystaveno</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Žádné opravné doklady nenalezeny</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note) => (
                  <tr key={note.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium">{note.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/faktury/${note.invoiceId}`} className="text-primary hover:underline text-sm">
                        {note.invoiceId}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{note.customer?.name ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{note.reason ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-red-600">{formatCurrency(note.total)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{formatDate(note.issueDate)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Zobrazeno {filteredNotes.length} z {allCreditNotes.length} opravných dokladů</p>
      </div>
    </div>
  )
}
