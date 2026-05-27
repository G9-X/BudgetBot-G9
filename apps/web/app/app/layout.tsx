import { MoneyShell } from "@/components/money-shell"

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MoneyShell>{children}</MoneyShell>
}
