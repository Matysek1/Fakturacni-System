"use client"
 

import { use } from "react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { ChevronLeft, Loader2, Receipt } from "lucide-react"
import Link from "next/link"
import DashboardNavbar from "~/app/componenty/navbar"
import { api } from "~/trpc/react"

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

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const expenseQuery = api.expense.getById.useQuery({ id })
  const expense = expenseQuery.data
  const isLoading = expenseQuery.isLoading
  const updateStatus = api.expense.updateStatus.useMutation()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("cs-CZ")
  }

  const utils = api.useUtils()

  const handleStatusChange = async (statusId: number) => {
    if (!expense) return
    await updateStatus.mutateAsync({ id: expense.id, statusId })
    await utils.expense.getById.invalidate({ id: expense.id })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50/50">
        <DashboardNavbar />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-blue-50/50">
        <DashboardNavbar />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Receipt className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">Náklad nenalezen</p>
            <Button asChild>
              <Link href="/naklady">Zpět na náklady</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const statusName: string = expense.status?.name ?? ""

  return (
    <div className="min-h-screen bg-blue-50/50">
      <DashboardNavbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/naklady">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Náklad {expense.id}</h1>
                <p className="text-muted-foreground text-sm">
                  Vytvořeno {formatDate(expense.createdAt)}
                </p>
              </div>
              <div className="ml-2">{getStatusBadge(statusName)}</div>
            </div>
            <div className="flex gap-2">
              {statusName === "ceka" && (
                <Button
                  variant="default"
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => handleStatusChange(4)}
                >
                  Označit jako zaplacenou
                </Button>
              )}
              {statusName === "koncept" && (
                <Button
                  variant="default"
                  onClick={() => handleStatusChange(2)}
                >
                  Aktivovat
                </Button>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Informace o nákladu</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Číslo</span>
                  <span className="text-sm font-medium">{expense.id}</span>
                </div>
                {expense.description && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Popis</span>
                    <span className="text-sm font-medium">{expense.description}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Datum vystavení</span>
                  <span className="text-sm font-medium">{formatDate(expense.issueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Splatnost</span>
                  <span className="text-sm font-medium">{formatDate(expense.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Celkem</span>
                  <span className="text-lg font-bold">{formatCurrency(expense.total)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Dodavatel</h2>
              {expense.customer ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Název</span>
                    <span className="text-sm font-medium">{expense.customer?.name ?? "—"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Neuvedeno</p>
              )}
            </Card>
          </div>

          {/* Items */}
          <Card className="overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Položky</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Popis</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Počet</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">MJ</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Cena</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">DPH</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Celkem</th>
                  </tr>
                </thead>
                <tbody>
                  {expense.items.map((item: { id: number; description: string; qty: number; unit: string | null; price: number; vat: number | null }) => {
                    const base = item.qty * item.price
                    const vat = base * ((item.vat ?? 0) / 100)
                    return (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-6 py-4 text-sm">{item.description}</td>
                        <td className="px-6 py-4 text-sm">{item.qty}</td>
                        <td className="px-6 py-4 text-sm">{item.unit ?? "ks"}</td>
                        <td className="px-6 py-4 text-sm">{formatCurrency(item.price)}</td>
                        <td className="px-6 py-4 text-sm">{item.vat ?? 0} %</td>
                        <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(base + vat)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Celkem</p>
                <p className="text-2xl font-bold">{formatCurrency(expense.total)}</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
