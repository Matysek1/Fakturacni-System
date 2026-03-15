"use client"

import { Card } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { FileText, Eye, Download, Loader2 } from "lucide-react"
import Link from "next/link"
import {api} from "~/trpc/react";
import { useSession } from "next-auth/react"


export function Invoices() {
  const { data: session } = useSession();

  const getStatusBadge = (statusName: string) => {
    switch (statusName) {
      case "zaplacena":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Zaplacena</Badge>
      case "ceka":
        return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Čeká</Badge>
      case "po_splatnosti":
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Po splatnosti</Badge>
      case "koncept":
        return <Badge className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">Koncept</Badge>
      default:
        return <Badge>{statusName}</Badge>
    }
  }
  const { data: invoices, isLoading } = api.invoice.get.useQuery({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", minimumFractionDigits: 0 }).format(amount)
  }

  const isAccountant = session?.user?.role === 2;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Poslední faktury</h2>
          <p className="text-muted-foreground mt-1">Přehled vašich nejnovějších faktur</p>
        </div>
        {!isAccountant && (
          <Button asChild>
            <Link href="/faktury/nova">
              <FileText className="mr-2 h-4 w-4" />
              Nová faktura
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Číslo faktury</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Klient</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Částka</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Datum</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Stav</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Akce</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : invoices && invoices.length > 0 ? (
                invoices.slice(0, 5).map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link href={`/faktury/${invoice.id}`} className="font-medium hover:underline">
                      {invoice.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{(invoice.customer as { name?: string })?.name ?? "—"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{formatCurrency(invoice.total)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString("cs-CZ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge((invoice.status as { name?: string })?.name ?? "")}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/faktury/${invoice.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Zatím nemáte žádné faktury</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border">
          <Button variant="ghost" asChild className="w-full">
            <Link href="/faktury">Zobrazit všechny faktury</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
