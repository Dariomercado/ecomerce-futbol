import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CartProvider } from "@/lib/cart/cart-provider";
import { hasVerifiedSupabaseSession } from "@/lib/auth/supabase-server";
import "./globals.css";

export const metadata: Metadata = { title: "Verde Arena", description: "Modern football essentials for training, matchday, and pitch culture." };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await hasVerifiedSupabaseSession();
  return <html lang="en" suppressHydrationWarning className="h-full antialiased"><body className="min-h-full bg-background font-sans text-foreground"><ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange><CartProvider><div className="flex min-h-dvh flex-col"><Header isAuthenticated={isAuthenticated} /><main className="flex flex-1 flex-col">{children}</main><Footer /></div></CartProvider></ThemeProvider></body></html>;
}
