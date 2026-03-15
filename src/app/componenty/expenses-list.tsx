"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
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
  MoreHorizontal,
  Eye,
  Trash2,
  Receipt,
  DollarSign,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { api } from "~/trpc/react"
import { AIExpenseImportDialog } from "./ai-expense-import"
import { useSession } from "next-auth/react"

export function ExpensesList() {
  const { data: session } = useSession();
  const isAccountant = session?.user?.role === 2;
  const [searchQuery, setSearchQuery] = useState("")

  const fetchExpenses = api.expense.get.useQuery({})
  const allExpenses: {
    id: string
    customerId: number | null
    userId: string
    issueDate: Date
    dueDate: Date
    total: number
    description: string | null
    statusId: number
    status: { id: number; name: string; label: string }
    createdAt: Date
    updatedAt: Date
    customer: { name: string } | null
  }[] = fetchExpenses.data ?? []
  const isLoading = fetchExpenses.isLoading

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("cs-CZ")
  }

  // Filter expenses
  const filteredExpenses = allExpenses.filter((expense) => {
    return (
      searchQuery === "" ||
      expense.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.customer?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Compute stats
  const totalAmount = allExpenses.reduce((sum, exp) => sum + exp.total, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Náklady</h1>
          <p className="text-muted-foreground mt-1">Přehled vašich nákladových faktur</p>
        </div>
        {!isAccountant && (
          <div className="flex items-center gap-3">
            <AIExpenseImportDialog />
            <Button asChild>
              <Link href="/naklady/novy">
                <Receipt className="mr-2 h-4 w-4" />
                Nový náklad
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Celkové náklady</p>
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Počet nákladů</p>
              <p className="text-lg font-bold">{allExpenses.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat náklady..."
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
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Dodavatel</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Popis</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Částka</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Datum vystavení</th>
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
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Žádné náklady nenalezeny</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/naklady/${expense.id}`} className="font-medium hover:underline">
                        {expense.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{expense.customer?.name ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{expense.description ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{formatCurrency(expense.total)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{formatDate(expense.issueDate)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/naklady/${expense.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/naklady/${expense.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Zobrazit
                              </Link>
                            </DropdownMenuItem>
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
        <p>Zobrazeno {filteredExpenses.length} z {allExpenses.length} nákladů</p>
      </div>
    </div>
  )
}
