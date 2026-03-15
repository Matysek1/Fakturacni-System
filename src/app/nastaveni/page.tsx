"use client"

import { Card, CardContent } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import  Navbar  from "~/app/componenty/navbar"
import { Building2, Hash, ChevronRight, User, Clipboard } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function SettingsPage() {
    const router = useRouter();
    const { data: session } = useSession();

    const userRole = session?.user.role;

    if (userRole !== 1 && userRole !== 2) {
      return (
        <div className="min-h-screen bg-blue-50/50">
          <Navbar />
          <div className="min-h-[60vh] flex items-center justify-center">
            <p className="text-xl font-semibold">Nemáte oprávnění k přístupu na tuto stránku.</p>
          </div>
        </div>
      );
    }

    const isAdmin = userRole === 1;

  return (
    <div className="min-h-screen bg-blue-50/50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Nastavení</h1>
          <p className="text-sm text-muted-foreground">
            Správa firemních údajů a chování aplikace
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {isAdmin && (
          <Card className="rounded-2xl hover:shadow-md transition">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-medium">Firemní údaje</h2>
                  <p className="text-sm text-muted-foreground">
                    Název firmy, IČO, DIČ, adresa, kontakt
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" asChild onClick={() => router.push("/company")}>
                  <ChevronRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
          )}

          <Card className="rounded-2xl hover:shadow-md transition">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Hash className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-medium">Číslování faktur</h2>
                  <p className="text-sm text-muted-foreground">
                    Formát čísla, prefix, rok, pořadí
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" asChild onClick={() => router.push("/invoice-series")}>
                  <ChevronRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="rounded-2xl hover:shadow-md transition">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-medium">Správa uživatelů</h2>
                  <p className="text-sm text-muted-foreground">
                    Přidávání, odebírání a úprava uživatelů aplikace
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" asChild onClick={() => router.push("/users")}>
                  <ChevronRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
          )}

          <Card className="rounded-2xl hover:shadow-md transition">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clipboard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-medium">Defaultní hodnoty faktury</h2>
                  <p className="text-sm text-muted-foreground">
                    Nastavení výchozích hodnot pro nové faktury
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" asChild onClick={() => router.push("/invoice-defaults")}>
                  <ChevronRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
           
        </div>
      </main>
    </div>
  )
}
