"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { Badge } from "~/components/ui/badge"
import { MoreHorizontal, Plus } from "lucide-react"
import  Navbar  from "~/app/componenty/navbar"
import {api} from "~/trpc/react"


type Customer = {
  id: number
  name: string
  ico?: string | null
  dic?: string | null
  address: string
  email: string
  createdAt: string
}

const initialCustomers: Customer[] = [
  {
    id: 1,
    name: "ABC Solutions s.r.o.",
    ico: "12345678",
    dic: "CZ12345678",
    address: "Pražská 12, 110 00 Praha",
    email: "info@abcsolutions.cz",
    createdAt: "14. 1. 2026",
  },
  {
    id: 2,
    name: "Novák Consulting",
    ico: "87654321",
    dic: null,
    address: "Brněnská 45, 602 00 Brno",
    email: "novak@consulting.cz",
    createdAt: "14. 1. 2026",
  },
  {
    id: 3,
    name: "TechSoft a.s.",
    ico: "11223344",
    dic: "CZ11223344",
    address: "Technická 8, 301 00 Plzeň",
    email: "office@techsoft.cz",
    createdAt: "14. 1. 2026",
  },
]


export default function CustomersPage() {
  const [customers] = useState(initialCustomers)
  const customersQuery = api.customer.get.useQuery()

  return (
    <div className="min-h-screen bg-blue-50/50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Zákazníci</h1>
            <p className="text-sm text-muted-foreground">
              Přehled odběratelů, kteří se zobrazují na fakturách
            </p>
          </div>

          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Přidat zákazníka
          </Button>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Seznam zákazníků</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>IČO</TableHead>
                  <TableHead>DIČ</TableHead>
                  <TableHead>Adresa</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Přidán</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {customersQuery.data?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell>{customer.ico ?? "—"}</TableCell>
                    <TableCell>
                      {customer.dic ? (
                        <Badge variant="secondary">{customer.dic}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{customer.address}</TableCell>
                    <TableCell>{customer.contact}</TableCell>
                    <TableCell>{new Date(customer.createdAt).toLocaleDateString('cs-CZ')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
