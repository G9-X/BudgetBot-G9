"use client"

import { AuthPage } from "@/components/marketing-pages"

export function AuthPageClient({ mode }: { mode: string }) {
  return <AuthPage mode={mode} />
}
