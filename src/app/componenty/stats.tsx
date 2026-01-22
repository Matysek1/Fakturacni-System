"use client"

import { Card } from "../../components/ui/card"
import { FileText, DollarSign, Clock, TrendingUp } from "lucide-react"

export function Stats() {
  const stats = [
    {
      title: "Celkové příjmy",
      value: "245 680 Kč",
      change: "+12.5%",
      icon: DollarSign,
      trend: "up",
    },
    {
      title: "Vystavené faktury",
      value: "48",
      change: "+8 tento měsíc",
      icon: FileText,
      trend: "up",
    },
    {
      title: "Čekající platby",
      value: "12 450 Kč",
      change: "5 faktur",
      icon: Clock,
      trend: "neutral",
    },
    {
      title: "Průměrná faktura",
      value: "5 118 Kč",
      change: "+3.2%",
      icon: TrendingUp,
      trend: "up",
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Přehled</h1>
        <p className="text-muted-foreground mt-1">Statistiky vaší firmy a poslední faktury</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {stat.trend === "up" && <span className="text-xs font-medium text-green-500">{stat.change}</span>}
                {stat.trend === "neutral" && (
                  <span className="text-xs font-medium text-muted-foreground">{stat.change}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
