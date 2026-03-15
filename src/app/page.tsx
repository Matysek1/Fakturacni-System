"use client"
import React from "react";
import Navbar from "~/app/componenty/navbar"
import { Stats } from "~/app/componenty/stats"
import { Invoices } from "~/app/componenty/invoices"
import { DashboardCharts } from "~/app/componenty/dashboard-charts"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-blue-50/50">
      <Navbar/>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <Stats />
          <DashboardCharts />
          <Invoices />
        </div>
      </main>
    </div>
  )
}
