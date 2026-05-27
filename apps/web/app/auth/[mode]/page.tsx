import { AuthPage } from "@/components/marketing-pages"

export default async function AuthRoute({
  params,
}: {
  params: Promise<{ mode: string }>
}) {
  const { mode } = await params
  return <AuthPage mode={mode} />
}
