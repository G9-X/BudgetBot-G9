"use client"

import { MoneySection } from "@/components/money-views"

const validSections = new Set([
  "overview",
  "import",
  "transactions",
  "review",
  "imports",
  "spending",
  "budgets",
  "recurring",
  "coach",
  "settings",
])

export function AppSectionClient({ section }: { section: string }) {
  if (!validSections.has(section)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-lg">Page not found</p>
      </div>
    )
  }

  return <MoneySection section={section} />
}
