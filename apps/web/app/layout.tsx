import type { Metadata } from "next"

import "@workspace/ui/globals.css"
import { MoneyCoachProvider } from "@/components/money-coach-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { DirectionProvider } from "@workspace/ui/components/direction"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

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
      className={cn("antialiased", "font-sans")}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Manrope:wght@200..800&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --font-sans: 'Manrope', ui-sans-serif, system-ui, sans-serif;
                --font-mono: 'Geist Mono', ui-monospace, monospace;
              }
            `,
          }}
        />
      </head>
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
