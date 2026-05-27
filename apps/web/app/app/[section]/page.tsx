import { AppSectionClient } from "./client"

const sections = [
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
]

export function generateStaticParams() {
  return sections.map((section) => ({ section }))
}

export default async function AppSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  return <AppSectionClient section={section} />
}
