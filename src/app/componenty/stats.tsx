"use client"
 

import { Card } from "../../components/ui/card"
import {
  FileText,
  DollarSign,
  Clock,
  TrendingUp,
  Loader2,
  Receipt,
} from "lucide-react"
import { api } from "~/trpc/react"

export function Stats() {
  const { data: invoices, isLoading: loadingInvoices } =
    api.invoice.get.useQuery({})
  const { data: expenses, isLoading: loadingExpenses } =
    api.expense.get.useQuery({})

  const isLoading = loadingInvoices || loadingExpenses

  // ── Compute live stats ───────────────────────────────────
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Invoices
  const allInvoices = invoices ?? []
  const paidInvoices = allInvoices.filter(
    (inv: { status: { name: string } }) => inv.status.name === "zaplacena"
  )
  const pendingInvoices = allInvoices.filter(
    (inv: { status: { name: string } }) =>
      inv.status.name === "ceka" || inv.status.name === "po_splatnosti"
  )
  const thisMonthInvoices = allInvoices.filter(
    (inv: { createdAt: string | Date }) => {
      const d = new Date(inv.createdAt)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }
  )

  // Revenue = sum of paid invoice totals
  const totalRevenue = paidInvoices.reduce(
    (sum: number, inv: { total: number }) => sum + inv.total,
    0
  )

  // Pending amount
  const pendingAmount = pendingInvoices.reduce(
    (sum: number, inv: { total: number }) => sum + inv.total,
    0
  )

  // Average invoice
  const avgInvoice =
    allInvoices.length > 0
      ? allInvoices.reduce(
          (sum: number, inv: { total: number }) => sum + inv.total,
          0
        ) / allInvoices.length
      : 0

  // Expenses
  const allExpenses = expenses ?? []
  const totalExpenses = allExpenses.reduce(
    (sum: number, exp: { total: number }) => sum + exp.total,
    0
  )
  const thisMonthExpenses = allExpenses.filter(
    (exp: { createdAt: string | Date }) => {
      const d = new Date(exp.createdAt)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }
  )

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const stats = [
    {
      title: "Celkové příjmy",
      value: formatCurrency(totalRevenue),
      change: `${paidInvoices.length} zaplacených faktur`,
      icon: DollarSign,
      trend: "up" as const,
    },
    {
      title: "Vystavené faktury",
      value: String(allInvoices.length),
      change: `+${thisMonthInvoices.length} tento měsíc`,
      icon: FileText,
      trend: "up" as const,
    },
    {
      title: "Čekající platby",
      value: formatCurrency(pendingAmount),
      change: `${pendingInvoices.length} faktur`,
      icon: Clock,
      trend: "neutral" as const,
    },
    {
      title: "Průměrná faktura",
      value: formatCurrency(avgInvoice),
      change: `z ${allInvoices.length} faktur`,
      icon: TrendingUp,
      trend: "up" as const,
    },
    {
      title: "Celkové náklady",
      value: formatCurrency(totalExpenses),
      change: `+${thisMonthExpenses.length} tento měsíc`,
      icon: Receipt,
      trend: "neutral" as const,
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Přehled</h1>
        <p className="text-muted-foreground mt-1">
          Statistiky vaší firmy a poslední faktury
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="p-6 relative overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {stat.trend === "up" && (
                  <span className="text-xs font-medium text-green-500">
                    {stat.change}
                  </span>
                )}
                {stat.trend === "neutral" && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {stat.change}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
