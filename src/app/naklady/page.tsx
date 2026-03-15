import DashboardNavbar from "~/app/componenty/navbar"
import { ExpensesList } from "../componenty/expenses-list"

export default async function ExpensesPage() {
  return (
    <div className="min-h-screen bg-blue-50/50">
      <DashboardNavbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ExpensesList />
      </main>
    </div>
  )
}
