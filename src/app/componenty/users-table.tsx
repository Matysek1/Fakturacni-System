"use client"

import type { User } from "~/app/users/page"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog"


interface UsersTableProps {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (userId: string) => void
}

const roleColors: Record<User["role"], string> = {
  1: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  2: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  3: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
}

const roleLabels: Record<User["role"], string> = {
  1: "Admin",
  2: "Účetní",
  3: "Uživatel",
}

export function UsersTable({ users, onEdit, onDelete }: UsersTableProps) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/50 bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Jméno</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Role</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Přidán</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4">
                    <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(user.createdAt!).toLocaleDateString("cs-CZ")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Upravit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" asChild>
                          <AlertDialog>
                            <AlertDialogTrigger className="w-full text-left flex items-center">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Smazat
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Potvrdit smazání uživatele</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Opravdu chcete smazat uživatele{" "}
                                  <span className="font-medium text-foreground">{user.name}</span>? Tuto akci nelze
                                  vrátit.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDelete(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Smazat
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">Zatím žádní uživatelé</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
