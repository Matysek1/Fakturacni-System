"use client"

import { Card } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { FileText, Eye, Download } from "lucide-react"
import Link from "next/link"
import {api} from "~/trpc/react";


export function Invoices() {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Zaplaceno</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Čeká</Badge>
      case "overdue":
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Po splatnosti</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }
  const fetchInvoices = api.invoice.get.useQuery({});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Poslední faktury</h2>
          <p className="text-muted-foreground mt-1">Přehled vašich nejnovějších faktur</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/invoices/new">
            <FileText className="mr-2 h-4 w-4" />
            Nová faktura
          </Link>
        </Button>
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
              {fetchInvoices.data?.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium">{invoice.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{invoice.customer.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{invoice.total}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString("cs-CZ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border">
          <Button variant="ghost" asChild className="w-full">
            <Link href="/dashboard/invoices">Zobrazit všechny faktury</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
