"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Switch } from "../../components/ui/switch"
import Navbar from "~/app/componenty/navbar"
import { api } from "~/trpc/react";
import { useEffect } from "react";
import { useSession } from "next-auth/react"
import { toast } from "sonner"


interface CompanyData {
  companyName: string
  address: string
  city: string
  postalCode: string
  ic: string
  dic: string
  bankAccount: string
  bankCode: string
  iban: string
  isVatPayer: boolean
}

export default function CompanySettingsForm() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<CompanyData>({
    companyName: "",
    address: "",
    city: "",
    postalCode: "",
    ic: "",
    dic: "",
    bankAccount: "",
    bankCode: "",
    iban: "",
    isVatPayer: true,
  })
  const fetchData =  api.company.get.useQuery();
  const updateCompany = api.company.update.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleVatToggle = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isVatPayer: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

        updateCompany.mutate({
        name: formData.companyName,
        address: formData.address,
        mesto: formData.city,
        psc: formData.postalCode,
        ico: formData.ic,
        dic: formData.dic,
        bankAccount: formData.bankAccount,
        bankCode: formData.bankCode,
        iban: formData.iban,
        isPayer: formData.isVatPayer,
    });
    toast.success("Firemní údaje byly uloženy.")
    setIsLoading(false)
  }

  const fetchDataFunction = () => {
      if (fetchData.data && !fetchData.error) {
          const u = fetchData.data as {
            name?: unknown
            address?: unknown
            mesto?: unknown
            psc?: unknown
            ico?: unknown
            dic?: unknown
            bankAccount?: unknown
            bankCode?: unknown
            iban?: unknown
            isPayer?: unknown
          }
  
          setFormData({
            companyName: typeof u.name === "string" ? u.name : "",
            address: typeof u.address === "string" ? u.address : "",
            city:  typeof u.mesto === "string" ? u.mesto : "",
            postalCode: typeof u.psc === "string" ? u.psc : "",
            ic: typeof u.ico === "string" ? u.ico : "",
            dic: typeof u.dic === "string" ? u.dic : "",
            bankAccount: typeof u.bankAccount === "string" ? u.bankAccount : "",
            bankCode: typeof u.bankCode === "string" ? u.bankCode : "",
            iban: typeof u.iban === "string" ? u.iban : "",
            isVatPayer: typeof u.isPayer === "boolean" ? u.isPayer : true,
          });
      }
  };
  useEffect(() => {
      fetchDataFunction();
  }, [fetchData.data]);

  if (session?.user.role !== 1) {
    return (
      <div className="min-h-screen bg-blue-50/50">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-xl font-semibold">Nemáte oprávnění k přístupu na tuto stránku.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-blue-50/50">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold mb-6">Nastavení společnosti</h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-xl border">
          <div className="space-y-2">
            <Label htmlFor="companyName">Název firmy</Label>
            <Input
              id="companyName"
              name="companyName"
              placeholder="Vaše Společnost s.r.o."
              value={formData.companyName}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresa</Label>
            <Textarea
              id="address"
              name="address"
              placeholder="Ulice, číslo domu"
              value={formData.address}
              onChange={handleChange}
              disabled={isLoading}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Město</Label>
              <Input
                id="city"
                name="city"
                placeholder="Praha"
                value={formData.city}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">PSČ</Label>
              <Input
                id="postalCode"
                name="postalCode"
                placeholder="110 00"
                value={formData.postalCode}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ic">IČ</Label>
              <Input
                id="ic"
                name="ic"
                placeholder="12345678"
                value={formData.ic}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            {formData.isVatPayer && (
              <div className="space-y-2">
                <Label htmlFor="dic">DIČ</Label>
                <Input
                  id="dic"
                  name="dic"
                  placeholder="CZ12345678"
                  value={formData.dic}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label className="font-medium">Plátce DPH</Label>
              <p className="text-xs text-muted-foreground">Označte, pokud je vaše firma plátcem DPH.</p>
            </div>
            <Switch checked={formData.isVatPayer} onCheckedChange={handleVatToggle} disabled={isLoading} />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Bankovní spojení</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Číslo účtu</Label>
                <Input
                  id="bankAccount"
                  name="bankAccount"
                  placeholder="1234567890"
                  value={formData.bankAccount}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankCode">Kód banky</Label>
                <Input
                  id="bankCode"
                  name="bankCode"
                  placeholder="0100"
                  value={formData.bankCode}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                name="iban"
                placeholder="CZ0000000000000000000000"
                value={formData.iban}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button type="submit" disabled={isLoading} className="gap-2">
              Uložit změny
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
