import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { template: "%s — CodeSnap", default: "CodeSnap — Share code snippets" },
  description: "Share and discover code snippets with syntax highlighting and AI explanations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        <TRPCReactProvider>
          <Header />
          <main className="flex-1">{children}</main>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
