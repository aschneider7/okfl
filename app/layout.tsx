import type {Metadata} from "next";
import "./globals.css";
import "./site-refresh.css";
import "./visual-overhaul.css";
import {AppShell} from "@/components/AppShell";
import {DataProvider} from "@/components/DataProvider";

const deploymentHost = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const metadataBase = new URL(deploymentHost ? (deploymentHost.startsWith("http") ? deploymentHost : `https://${deploymentHost}`) : "http://localhost:3000");
const title = "OKFL OS 4.2 · League Intelligence";
const description = "The Obama Keeper Fantasy League command center for trades, drafts, keepers, records, and franchise intelligence.";

export const metadata: Metadata = {
  metadataBase, title, description,
  openGraph: {title, description, type: "website", images: [{url: "/og.png", width: 1536, height: 1024, alt: "OKFL OS League Intelligence"}]},
  twitter: {card: "summary_large_image", title, description, images: ["/og.png"]},
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body><DataProvider><AppShell>{children}</AppShell></DataProvider></body></html>;
}
