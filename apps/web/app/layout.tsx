import type { Metadata } from "next"
import { Geist_Mono, Manrope } from "next/font/google"

import "@workspace/ui/globals.css"
import { MoneyCoachProvider } from "@/components/money-coach-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { DirectionProvider } from "@workspace/ui/components/direction"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

const fontSans = Manrope({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Money Coach | Personal finance clarity",
  description:
    "Turn Vietnamese bank statements into clear spending insights with reviewable AI classification.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="vi"
      dir="ltr"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        fontSans.variable,
        "font-sans"
      )}
    >
      <body>
        <DirectionProvider dir="ltr">
          <ThemeProvider>
            <TooltipProvider>
              <MoneyCoachProvider>{children}</MoneyCoachProvider>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  )
}
