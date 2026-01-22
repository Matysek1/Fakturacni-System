import  DashboardNavbar  from "~/app/componenty/navbar"
import { InvoicesList } from "../componenty/invoices-list"

export default async function InvoicesPage() {


  return (
    <div className="min-h-screen bg-blue-50/50">
      <DashboardNavbar/>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InvoicesList />
      </main>
    </div>
  )
}