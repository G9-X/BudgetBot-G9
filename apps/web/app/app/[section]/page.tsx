import { notFound } from "next/navigation"

import { MoneySection } from "@/components/money-views"

const sections = new Set([
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

export default async function AppSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  if (!sections.has(section)) {
    notFound()
  }

  return <MoneySection section={section} />
}
