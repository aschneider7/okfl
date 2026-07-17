import type { Metadata } from "next";
import "./globals.css";
import "./site-refresh.css";
import { AppShell } from "@/components/AppShell";
import { DataProvider } from "@/components/DataProvider";

export const metadata: Metadata = {
  title: "OKFL OS · Version 3",
  description: "Obama Keeper Fantasy League archive and analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  );
}
