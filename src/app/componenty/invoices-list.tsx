"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Card } from "../../components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import {
  Search,
  Download,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Send,
  FileText,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Loader2,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import {api} from "~/trpc/react"
import { toast } from "sonner"

const statusOptions = [
  { id: 1, name: "koncept", label: "Koncept" },
  { id: 2, name: "ceka", label: "Čeká" },
  { id: 3, name: "po_splatnosti", label: "Po splatnosti" },
  { id: 4, name: "zaplacena", label: "Zaplacena" },
]

function getStatusBadge(statusName: string) {
  switch (statusName) {
    case "zaplacena":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Zaplacena</Badge>
    case "ceka":
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Čeká</Badge>
    case "po_splatnosti":
      return <Badge className="bg-red-100 text-red-700 border-red-200">Po splatnosti</Badge>
    case "koncept":
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Koncept</Badge>
    default:
      return <Badge variant="outline">{statusName}</Badge>
  }
}

export function InvoicesList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const utils = api.useUtils()
  const fetchInvoices = api.invoice.get.useQuery({});
  const updateStatusMutation = api.invoice.updateStatus.useMutation({
    onSuccess: () => {
      void utils.invoice.get.invalidate()
    },
  })
  const allInvoices: {
    id: string
    customerId: number
    userId: string
    issueDate: Date
    dueDate: Date
    total: number
    discount: number | null
    statusId: number
    status: { id: number; name: string; label: string }
    createdAt: Date
    updatedAt: Date
    customer: { name: string }
  }[] = fetchInvoices.data ?? []
  const isLoading = fetchInvoices.isLoading

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("cs-CZ")
  }

  // Filter invoices
  const filteredInvoices = allInvoices.filter((invoice) => {
    const matchesSearch = searchQuery === "" ||
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status.name === statusFilter
    return matchesSearch && matchesStatus
  })

  // Compute stats
  const totalAmount = allInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const paidAmount = allInvoices
    .filter((inv) => inv.status.name === "zaplacena")
    .reduce((sum, inv) => sum + inv.total, 0)
  const pendingAmount = allInvoices
    .filter((inv) => inv.status.name === "ceka" || inv.status.name === "po_splatnosti")
    .reduce((sum, inv) => sum + inv.total, 0)
  const overdueCount = allInvoices.filter((inv) => {
    if (inv.status.name === "zaplacena" || inv.status.name === "koncept") return false
    return new Date(inv.dueDate) < new Date()
  }).length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Celkem</p>
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Zaplaceno</p>
              <p className="text-lg font-bold">{formatCurrency(paidAmount)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nezaplaceno</p>
              <p className="text-lg font-bold">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Po splatnosti</p>
              <p className="text-lg font-bold">{overdueCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat faktury..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: "all", label: "Vše" },
            { value: "ceka", label: "Čeká" },
            { value: "po_splatnosti", label: "Po splatnosti" },
            { value: "zaplacena", label: "Zaplacena" },
            { value: "koncept", label: "Koncepty" },
          ].map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Číslo</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Odběratel</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Částka</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Splatnost</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Stav</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Akce</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Žádné faktury nenalezeny</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const isDraft = invoice.status.name === "koncept"
                  return (
                    <tr key={invoice.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/faktury/${invoice.id}`} className="font-medium hover:underline text-primary">
                          {invoice.id}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{invoice.customer.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{formatCurrency(invoice.total)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{formatDate(invoice.dueDate)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
                              <div className="flex items-center gap-1">
                                {getStatusBadge(invoice.status.name)}
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {statusOptions.map((option) => (
                              <DropdownMenuItem
                                key={option.id}
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: invoice.id,
                                    statusId: option.id,
                                  })
                                }
                                className={invoice.status.name === option.name ? "bg-accent" : ""}
                              >
                                {getStatusBadge(option.name)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" title="Náhled" asChild>
                            <Link href={`/faktury/${invoice.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {isDraft && (
                            <Button variant="ghost" size="icon" title="Upravit" asChild>
                              <Link href={`/faktury/${invoice.id}/upravit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/faktury/${invoice.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Zobrazit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/faktury/${invoice.id}/upravit`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Upravit
                                </Link>
                              </DropdownMenuItem>
                              {!isDraft && (
                                <>
                                  <DropdownMenuItem disabled>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplikovat (připravujeme)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    // TODO: Implement PDF download in list view
                                    toast.info("Pro stažení PDF otevřete detail faktury.")
                                  }}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Stáhnout PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled>
                                    <Send className="mr-2 h-4 w-4" />
                                    Odeslat (připravujeme)
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (confirm("Opravdu chcete smazat tuto fakturu?")) {
                                    // Assuming a delete mutation exists on the router, but wait we need to use it
                                    // Actually, if we just alert for now or write the mutation:
                                    toast.info("Mazání z tohoto pohledu zatím není implementováno.")
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Smazat
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Zobrazeno {filteredInvoices.length} z {allInvoices.length} faktur</p>
      </div>
    </div>
  )
}
