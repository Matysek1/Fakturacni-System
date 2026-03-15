"use client"

import { useMemo } from "react"
import { Card } from "../../components/ui/card"
import { Loader2 } from "lucide-react"
import { api } from "~/trpc/react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

/* ───── helpers ──────────────────────────────────── */

/** Build array of last 12 months (label + key) */
function getLast12Months() {
  const months: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" })
    months.push({ key, label })
  }
  return months
}

function toMonthKey(date: Date | string) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)

/* ───── status chart colours ────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  zaplacena: "#22c55e",
  ceka: "#eab308",
  po_splatnosti: "#ef4444",
  koncept: "#94a3b8",
}

const STATUS_LABELS: Record<string, string> = {
  zaplacena: "Zaplacena",
  ceka: "Čeká",
  po_splatnosti: "Po splatnosti",
  koncept: "Koncept",
}

/* ───── custom tooltip ──────────────────────────── */

interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: { fill: string } }[]
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0]!
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p style={{ color: entry.payload.fill }} className="font-medium">
        {entry.name}: {entry.value}
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════ */

export function DashboardCharts() {
  const { data: invoices, isLoading: loadingInv } = api.invoice.get.useQuery({})
  const { data: expenses, isLoading: loadingExp } = api.expense.get.useQuery({})
  const isLoading = loadingInv || loadingExp

  /* ── bar chart data (revenue vs expenses per month) ── */
  const barData = useMemo(() => {
    const months = getLast12Months()
    const inv = invoices ?? []
    const exp = expenses ?? []

    // Only count paid invoices as revenue
    const revenueMap = new Map<string, number>()
    inv
      .filter((i: { status: { name: string } }) => i.status.name === "zaplacena")
      .forEach((i: { issueDate: Date | string; total: number }) => {
        const key = toMonthKey(i.issueDate)
        revenueMap.set(key, (revenueMap.get(key) ?? 0) + i.total)
      })

    const expenseMap = new Map<string, number>()
    exp.forEach((e: { issueDate: Date | string; total: number }) => {
      const key = toMonthKey(e.issueDate)
      expenseMap.set(key, (expenseMap.get(key) ?? 0) + e.total)
    })

    return months.map((m) => ({
      name: m.label,
      Příjmy: Math.round(revenueMap.get(m.key) ?? 0),
      Náklady: Math.round(expenseMap.get(m.key) ?? 0),
    }))
  }, [invoices, expenses])

  /* ── pie chart data (invoice status breakdown) ── */
  const pieData = useMemo(() => {
    const inv = invoices ?? []
    const counts = new Map<string, number>()
    inv.forEach((i: { status: { name: string } }) => {
      const name = i.status.name
      counts.set(name, (counts.get(name) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([name, value]) => ({
        name: STATUS_LABELS[name] ?? name,
        value,
        statusKey: name,
      }))
      .sort((a, b) => b.value - a.value)
  }, [invoices])

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Revenue vs Expenses bar chart ── */}
      <Card className="lg:col-span-2 p-6 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Příjmy vs. Náklady</h3>
          <p className="text-sm text-muted-foreground">Posledních 12 měsíců</p>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={50}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="Příjmy" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Náklady" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Invoice status donut ── */}
      <Card className="p-6 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Stav faktur</h3>
          <p className="text-sm text-muted-foreground">Rozložení dle statusu</p>
        </div>
        <div className="h-[300px]">
          {pieData.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Žádná data k zobrazení
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.statusKey}
                      fill={STATUS_COLORS[entry.statusKey] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}
