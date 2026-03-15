import "~/styles/globals.css";

import { type Metadata } from "next";
import { Providers } from "~/app/providers";
import { Toaster } from "sonner";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Webová fakturační aplikace",
  description: "Fakturační aplikace pro malé firmy a OSVČ",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <TRPCReactProvider>
          <Providers>
            {children}
          </Providers>
        </TRPCReactProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
