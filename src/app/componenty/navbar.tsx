"use client"

import { Button } from "../../components/ui/button"
import { FileText, Menu, X, LogOut, User, Settings, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { signOut } from "next-auth/react"
import { usePathname } from "next/navigation"



function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session } = useSession();
  const pathname = usePathname();

  const navClass = (href: string) => {
    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
    return isActive
      ? "text-sm font-semibold text-foreground transition-colors"
      : "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
  }

  const mobileNavClass = (href: string) => {
    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
    return isActive
      ? "block px-3 py-2 text-base font-semibold text-foreground bg-accent rounded-md transition-colors"
      : "block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
  }
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Fakturace</span>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-6">
            <Link href="/" className={navClass("/")}>
              Přehled
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className={`flex items-center gap-1 ${pathname.startsWith("/faktury") || pathname.startsWith("/dobropisy") || pathname.startsWith("/sablony") ? "text-sm font-semibold text-foreground" : "text-sm font-medium text-muted-foreground hover:text-foreground"} transition-colors`}>
                Doklady
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/faktury">Faktury</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dobropisy">Opravné daňové doklady</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/sablony">Šablony faktur</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/naklady" className={navClass("/naklady")}>
              Náklady
            </Link>
            <Link href="/vypis" className={navClass("/vypis")}>
              Výpis
            </Link>
            <Link href="/customers" className={navClass("/customers")}>
              Klienti
            </Link>
            {(session?.user?.role === 1 || session?.user?.role === 2) && (
              <Link href="/nastaveni" className={navClass("/nastaveni")}>
                Nastavení
              </Link>
            )}
          </div>

          <div className="hidden md:flex md:items-center md:gap-3">
          {session?.user?.role !== 2 && (
            <Button asChild>
              <Link href="/faktury/nova">Nová faktura</Link>
            </Button>
          )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{session?.user?.name ?? "Uživatel"}</p>
                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(session?.user?.role === 1 || session?.user?.role === 2) && (
                  <DropdownMenuItem asChild>
                    <Link href="/nastaveni" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Nastavení
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Odhlásit se
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button
            type="button"
            className="md:hidden rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 py-4 space-y-3">
            <Link href="/" className={mobileNavClass("/")} onClick={() => setMobileMenuOpen(false)}>
              Přehled
            </Link>
            <Link href="/faktury" className={mobileNavClass("/faktury")} onClick={() => setMobileMenuOpen(false)}>
              Faktury
            </Link>
            <Link href="/dobropisy" className={mobileNavClass("/dobropisy")} onClick={() => setMobileMenuOpen(false)}>
              Opravné daňové doklady
            </Link>
            <Link href="/naklady" className={mobileNavClass("/naklady")} onClick={() => setMobileMenuOpen(false)}>
              Náklady
            </Link>
            <Link href="/vypis" className={mobileNavClass("/vypis")} onClick={() => setMobileMenuOpen(false)}>
              Výpis
            </Link>
            <Link href="/customers" className={mobileNavClass("/customers")} onClick={() => setMobileMenuOpen(false)}>
              Klienti
            </Link>
            {(session?.user?.role === 1 || session?.user?.role === 2) && (
              <Link href="/nastaveni" className={mobileNavClass("/nastaveni")} onClick={() => setMobileMenuOpen(false)}>
                Nastavení
              </Link>
            )}
            <div className="pt-3 space-y-2 border-t border-border/50">
              {session?.user?.role !== 2 && (
                <Button className="w-full" asChild>
                  <Link href="/dashboard/invoices/new">Nová faktura</Link>
                </Button>
              )}
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{session?.user?.name ?? "Uživatel"}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Odhlásit se
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
export default Navbar