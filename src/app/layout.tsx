import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CartProvider } from "@/lib/cart/cart-provider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

export const metadata: Metadata = { title: "Verde Arena", description: "Modern football essentials for training, matchday, and pitch culture." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning className={`${inter.variable} ${sora.variable} h-full antialiased`}><body className="min-h-full bg-background font-sans text-foreground"><ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange><CartProvider><div className="flex min-h-dvh flex-col"><Header /><main className="flex flex-1 flex-col">{children}</main><Footer /></div></CartProvider></ThemeProvider></body></html>;
}
