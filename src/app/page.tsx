"use client"
import React, { use } from "react";
import Navbar from "~/app/componenty/navbar"
import { Stats } from "~/app/componenty/stats"
import { Invoices } from "~/app/componenty/invoices"
import { useSession, signIn } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
          

  if(!session?.user ){
    return <div>Redirecting to sign in...</div>;
  }
  
  return (
    <div className="min-h-screen bg-blue-50/50">
      <Navbar/>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <Stats />
          <Invoices />
        </div>
      </main>
    </div>
  )
}
