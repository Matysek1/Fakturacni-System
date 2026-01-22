import  DashboardNavbar  from "~/app/componenty/navbar"
import { InvoiceDetail } from "~/app/componenty/invoice-detail"

interface InvoicePageProps {
  params: Promise<{ id: string }>
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params
  


  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InvoiceDetail invoiceId={id} />
      </main>
    </div>
  )
}
