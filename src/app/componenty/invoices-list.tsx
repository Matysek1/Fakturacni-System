"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Card } from "../../components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import {
  Plus,
  Search,
  Filter,
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
} from "lucide-react"
import Link from "next/link"
import {api} from "~/trpc/react"

type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled"

interface Invoice {
  id: string
  number: string
  client: string
  issueDate: string
  dueDate: string
  amount: number
  status: InvoiceStatus
  type: "invoice" | "proforma" | "credit"
}

const mockInvoices: Invoice[] = [
  { id: "1", number: "25-001", client: "ABC Company s.r.o.", issueDate: "2025-01-15", dueDate: "2025-01-29", amount: 125000, status: "paid", type: "invoice" },
  { id: "2", number: "25-002", client: "XYZ Services a.s.", issueDate: "2025-01-18", dueDate: "2025-02-01", amount: 45500, status: "pending", type: "invoice" },
  { id: "3", number: "25-003", client: "Tech Solutions s.r.o.", issueDate: "2025-01-20", dueDate: "2025-02-03", amount: 89000, status: "overdue", type: "invoice" },
  { id: "4", number: "25-004", client: "Digital Agency s.r.o.", issueDate: "2025-01-22", dueDate: "2025-02-05", amount: 32000, status: "draft", type: "invoice" },
  { id: "5", number: "25-005", client: "Marketing Pro a.s.", issueDate: "2025-01-22", dueDate: "2025-02-05", amount: 67500, status: "pending", type: "proforma" },
  { id: "6", number: "25-006", client: "Creative Studio s.r.o.", issueDate: "2025-01-10", dueDate: "2025-01-24", amount: 18500, status: "paid", type: "invoice" },
  { id: "7", number: "25-007", client: "Web Masters s.r.o.", issueDate: "2025-01-08", dueDate: "2025-01-22", amount: 95000, status: "cancelled", type: "invoice" },
  { id: "8", number: "25-008", client: "Data Analytics a.s.", issueDate: "2025-01-21", dueDate: "2025-02-04", amount: 156000, status: "pending", type: "invoice" },
]

const getStatusBadge = (status: InvoiceStatus) => {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Zaplaceno</Badge>
    case "pending":
      return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Čeká</Badge>
    case "overdue":
      return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Po splatnosti</Badge>
    case "draft":
      return <Badge className="bg-muted text-muted-foreground hover:bg-muted/80">Koncept</Badge>
    case "cancelled":
      return <Badge className="bg-muted text-muted-foreground hover:bg-muted/80">Zrušeno</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

const typeLabels: Record<string, string> = {
  invoice: "Faktura",
  proforma: "Zálohovka",
  credit: "Dobropis",
}

export function InvoicesList() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.number.toLowerCase().includes(search.toLowerCase()) ||
      invoice.client.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesType = typeFilter === "all" || invoice.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", minimumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("cs-CZ")
  }
  const fetchInvoices = api.invoice.get.useQuery({});

  const totalAmount = mockInvoices.filter((i) => i.status !== "cancelled").reduce((sum, i) => sum + i.amount, 0)
  const paidAmount = mockInvoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0)
  const pendingAmount = mockInvoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((sum, i) => sum + i.amount, 0)
  const overdueCount = mockInvoices.filter((i) => i.status === "overdue").length

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faktury</h1>
          <p className="text-muted-foreground mt-1">Přehled všech vystavených faktur</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/invoices/new">
            <FileText className="mr-2 h-4 w-4" />
            Nová faktura
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-green-500">+12.5%</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Celkový objem</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalAmount)}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{mockInvoices.filter((i) => i.status === "paid").length} faktur</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Zaplaceno</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(paidAmount)}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{mockInvoices.filter((i) => i.status === "pending").length} faktur</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Čekající platby</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(pendingAmount)}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-xs font-medium text-red-500">Vyžaduje pozornost</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Po splatnosti</p>
            <p className="text-2xl font-bold mt-1">{overdueCount} faktur</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Hledat podle čísla nebo klienta..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Stav" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="draft">Koncept</SelectItem>
                <SelectItem value="sent">Čekající</SelectItem>
                <SelectItem value="paid">Zaplaceno</SelectItem>
                <SelectItem value="overdue">Po splatnosti</SelectItem>
                <SelectItem value="cancelled">Zrušeno</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                <SelectItem value="invoice">Faktura</SelectItem>
                <SelectItem value="proforma">Zálohovka</SelectItem>
                <SelectItem value="credit">Dobropis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Číslo faktury</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Klient</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Typ</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Částka</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Splatnost</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Stav</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Akce</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Žádné faktury nenalezeny</p>
                    </div>
                  </td>
                </tr>
              ) : (
                fetchInvoices.data?.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium">{invoice.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{invoice.customer.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{"Faktura"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{formatCurrency(invoice.total)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{formatDate(invoice.dueDate.toString())}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(invoice.status as InvoiceStatus)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Zobrazit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Upravit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplikovat
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Stáhnout PDF
                            </DropdownMenuItem>
                            {invoice.status === "draft" && (
                              <DropdownMenuItem>
                                <Send className="mr-2 h-4 w-4" />
                                Odeslat
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Smazat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Zobrazeno {filteredInvoices.length} z {mockInvoices.length} faktur</p>
      </div>
    </div>
  )
}
