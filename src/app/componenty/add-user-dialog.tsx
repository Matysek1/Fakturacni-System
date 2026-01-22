"use client"

import type React from "react"

import { useState } from "react"
import type { User } from "~/app/users/page"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Loader2 } from "lucide-react"
import { api } from "~/trpc/react";

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (user: Omit<User, "id" | "createdAt">) => void
}

export function AddUserDialog({ open, onOpenChange, onAdd }: AddUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
    const createUser = api.user.create.useMutation();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: 1 as User["role"],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)


    const fotrmData = createUser.mutateAsync({
        name: formData.name,
        email: formData.email,
        roleId: formData.role === 1 ? 1 : formData.role === 2 ? 2 : 3,
    }
    

    );

    await fotrmData;

    if (formData.name && formData.email) {
      onAdd(formData)
      setFormData({ name: "", email: "", role: 1 })
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přidat nového uživatele</DialogTitle>
          <DialogDescription>Vyplňte údaje pro vytvoření nového uživatele v systému.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Jméno</Label>
            <Input
              id="name"
              placeholder="Petr Novák"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="petr@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role.toString()}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  role: parseInt(value) as User["role"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Uživatel</SelectItem>
                <SelectItem value="2">Účetní</SelectItem>
                <SelectItem value="1">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Přidávám...
                </>
              ) : (
                "Přidat uživatele"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
