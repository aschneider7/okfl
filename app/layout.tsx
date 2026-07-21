import type {Metadata} from "next";
import "./globals.css";
import "./site-refresh.css";
import "./visual-overhaul.css";
import "./smooth-ui.css";
import "./live-suite.css";
import "./qol-polish.css";
import "./awards-suite.css";
import "./editorial-v7.css";
import "./keeper-submission.css";
import "./my-franchise.css";
import "./league-intelligence.css";
import {AppShell} from "@/components/AppShell";
import {DataProvider} from "@/components/DataProvider";
import {AuthProvider} from "@/components/AuthProvider";

const deploymentHost = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const metadataBase = new URL(deploymentHost ? (deploymentHost.startsWith("http") ? deploymentHost : `https://${deploymentHost}`) : "http://localhost:3000");
const title = "OKFL OS 8.0 · League Intelligence";
const description = "The Obama Keeper Fantasy League, reframed through live standings, playoff odds, trades, drafts, records, and franchise intelligence.";

export const metadata: Metadata = {
  metadataBase, title, description,
  icons:{icon:"/okfl-logo.png",apple:"/okfl-logo.png"},
  openGraph: {title, description, type: "website", images: [{url: "/og-v3.png", width: 1536, height: 1024, alt: "OKFL OS — The League, Reframed"}]},
  twitter: {card: "summary_large_image", title, description, images: ["/og-v3.png"]},
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body><AuthProvider><DataProvider><AppShell>{children}</AppShell></DataProvider></AuthProvider></body></html>;
}
