import  DashboardNavbar  from "~/app/componenty/navbar"
import   InvoiceDefaultsForm  from "~/app/componenty/invoice-defaults-form"

export default async function InvoiceDefaultsPage() {


  return (
    <div className="min-h-screen bg-blue-50/50">
      <DashboardNavbar/>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <InvoiceDefaultsForm />
        </div>
      </main>
    </div>
  )
}
