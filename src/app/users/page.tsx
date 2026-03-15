"use client"

import { useEffect, useState } from "react"
import Navbar from "~/app/componenty/navbar"
import { UsersTable } from "~/app/componenty/users-table"
import { AddUserDialog } from "~/app/componenty/add-user-dialog"
import { EditUserDialog } from "~/app/componenty/edit-user-dialog"
import { Button } from  "../../components/ui/button"
import { Plus } from "lucide-react"
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react"
import { toast } from "sonner"



export interface User {
  id: string
  name: string
  email: string
  role: 1 | 2 | 3
  createdAt?: Date
}


export default function UsersPage() {


  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
        const fetchUsers = api.user.get.useQuery();
        const deleteUser = api.user.delete.useMutation({
          onSuccess: () => { toast.success("Uživatel byl úspěšně smazán.") },
          onError: () => { toast.error("Chyba při mazání uživatele.") },
        });
        const editUser = api.user.edit.useMutation({
          onSuccess: () => { toast.success("Uživatel byl úspěšně upraven.") },
          onError: () => { toast.error("Chyba při úpravě uživatele.") },
        });
        const { data: session } = useSession();

  const handleAddUser = (newUser: Omit<User, "id" | "createdAt">) => {
    setIsAddDialogOpen(false)
    const created = new Date()
    const newUserWithId: User = {
      id: created.getTime().toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: created,
    }
    setUsers((prev) => [...prev, newUserWithId])
  }

  const handleEditUser = (updatedUser: User) => {
    editUser.mutate({
      id: (updatedUser.id),
      name: updatedUser.name,
      email: updatedUser.email,
      roleId: updatedUser.role,
    });
    setIsEditDialogOpen(false)
    setEditingUser(null)
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)))


  }

  const handleDeleteUser = (userId: string) => {
    deleteUser.mutate({ id: (userId) });
    getUsers();    
        setUsers(users.filter((u) => u.id !== userId))

  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setIsEditDialogOpen(true)
  }



    const getUsers = () => {
        if (!fetchUsers.data) {
          setUsers([]);
          return;
        }

        setUsers(
          fetchUsers.data.map(u => ({
            id: (u.id),
            name: u.name ?? "",
            email: u.email ?? "",
            role: u.roleId as 1 | 2 | 3,
            createdAt: u.createdAt,
          }))
        );
    };
    useEffect(() => {
        getUsers();
    }, [fetchUsers.data]);
    console.log("session?.user.role ", session?.user.role);
    if (session?.user.role !== 1) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="text-xl font-semibold">Nemáte oprávnění k přístupu na tuto stránku.</p>
    </div>;
  }

    if (fetchUsers.isLoading) {
    return <div>Načítání uživatelů...</div>;
  }



  return (
    <div className="min-h-screen bg-blue-50/50">
      <Navbar/>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Správa uživatelů</h1>
              <p className="text-muted-foreground mt-2">Správujte uživatele, jejich role a přístupová práva</p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Přidat uživatele
            </Button>
          </div>

          <UsersTable users={users} onEdit={openEditDialog} onDelete={handleDeleteUser} />
        </div>
      </main>

      <AddUserDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAdd={handleAddUser} />

      {editingUser && (
        <EditUserDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          user={editingUser}
          onEdit={handleEditUser}
        />
      )}
    </div>
  )
}
