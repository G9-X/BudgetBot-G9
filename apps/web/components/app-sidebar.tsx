"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowLeftRightIcon,
  BotIcon,
  ChartNoAxesColumnIcon,
  CircleDollarSignIcon,
  FolderClockIcon,
  GaugeIcon,
  LogOutIcon,
  RefreshCwIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UploadIcon,
  WalletCardsIcon,
} from "lucide-react"

import { useMoneyCoach } from "@/components/money-coach-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

const navItems = [
  { key: "overview", icon: GaugeIcon, href: "/app/overview" },
  { key: "transactions", icon: ArrowLeftRightIcon, href: "/app/transactions" },
  { key: "review", icon: ShieldCheckIcon, href: "/app/review" },
  { key: "spending", icon: ChartNoAxesColumnIcon, href: "/app/spending" },
  { key: "budgets", icon: WalletCardsIcon, href: "/app/budgets" },
  { key: "recurring", icon: RefreshCwIcon, href: "/app/recurring" },
  { key: "coach", icon: BotIcon, href: "/app/coach" },
]

const managementItems = [
  { key: "imports", icon: FolderClockIcon, href: "/app/imports" },
  { key: "settings", icon: Settings2Icon, href: "/app/settings" },
]

function label(key: string, locale: "vi" | "en") {
  const labels: Record<string, [string, string]> = {
    overview: ["Tổng quan", "Overview"],
    transactions: ["Giao dịch", "Transactions"],
    review: ["Chờ duyệt", "Review queue"],
    spending: ["Phân tích", "Spending"],
    budgets: ["Ngân sách", "Budgets"],
    recurring: ["Định kỳ", "Recurring"],
    coach: ["Trợ lý", "Coach"],
    imports: ["Lịch sử nhập", "Import history"],
    settings: ["Cài đặt", "Settings"],
  }
  return labels[key]?.[locale === "vi" ? 0 : 1] ?? key
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { locale, signOut, state } = useMoneyCoach()
  const txList = Array.isArray(state.transactions)
    ? state.transactions
    : (state.transactions as unknown as { transactions?: unknown[] })
        ?.transactions ?? []
  const pending = (txList as { status?: string }[]).filter(
    (transaction) => transaction.status === "NEEDS_REVIEW"
  ).length

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/app/overview">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CircleDollarSignIcon />
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">Money Coach</span>
                  <span className="text-xs text-muted-foreground">
                    Personal finance
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {locale === "vi" ? "Tài chính của bạn" : "Your money"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{label(item.key, locale)}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.key === "review" && pending > 0 ? (
                    <SidebarMenuBadge>{pending}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>
            {locale === "vi" ? "Quản lý" : "Management"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/app/import"}
                >
                  <Link href="/app/import">
                    <UploadIcon />
                    <span>{locale === "vi" ? "Nhập sao kê" : "Import"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{label(item.key, locale)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                signOut()
                router.push("/auth/sign-in")
              }}
            >
              <LogOutIcon />
              <span>
                {locale === "vi" ? "Đăng xuất demo" : "Sign out demo"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
