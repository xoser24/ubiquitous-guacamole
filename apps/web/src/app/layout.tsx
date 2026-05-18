import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Altınordu Spor Kulübü",
  description: "Altınordu Spor Kulübü yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Arkaplan: elit gradient + blur blob'lar */}
        <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[color:var(--gold)]/15 blur-3xl" />
          <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/20" />
        </div>
        {children}
      </body>
    </html>
  );
}
