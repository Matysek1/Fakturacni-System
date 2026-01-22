import DashboardNavbar from "~/app/componenty/navbar"
import { InvoiceSeriesForm } from "~/app/componenty/invoice-series-form"

export default async function InvoiceSeriesPage() {


  return (
    <div className="min-h-screen bg-blue-50/50">
      <DashboardNavbar/>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Číselná řada faktur</h1>
            <p className="text-muted-foreground mt-2">Nastavte formát číslování vašich faktur</p>
          </div>
          <InvoiceSeriesForm />
        </div>
      </main>
    </div>
  )
}
