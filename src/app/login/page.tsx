"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Mail, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isOk, setIsOk] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

      try {
    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: "/",
    });

    if (result?.error) {
      setErrorMessage("Tento e-mail není povolen pro přihlášení.");
      setIsOk(false);
      return;
    }

    setIsSubmitted(true);
    } catch (error) {
      console.error("Error signing in:", error);
      setErrorMessage(error instanceof Error ? error.message : "Neznámá chyba");
      setIsOk(false);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    if (isOk) {
    return (
            <div className="min-h-screen flex items-center justify-center bg-blue-50/50 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-accent" />
          </div>
          <CardTitle className="text-2xl font-bold">Zkontrolujte svůj email</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Poslali jsme vám přihlašovací odkaz na adresu <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            Klikněte na odkaz v emailu pro dokončení přihlášení.
          </p>
        </CardContent>
      </Card>
        </div>
    )
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md border-border/50 shadow-2xl">

            <CardHeader className="space-y-3 text-center">
              <CardTitle className="text-2xl font-bold">Chyba odeslání</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Nastala chyba při odesílání přihlašovacího odkazu na adresu <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                {errorMessage}
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md border-border/50 shadow-2xl">
      <CardHeader className="space-y-3">
        <div className="space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">Přihlášení</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Zadejte svůj email pro přihlášení do fakturační aplikace
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="vas@email.cz"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 bg-background border-border"
            />
          </div>
          <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Odesílám...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Odeslat přihlašovací odkaz
              </>
            )}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">Přihlašovací odkaz bude platný 5 minut</p>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
