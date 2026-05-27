export const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Utilities",
  "Entertainment",
  "Health",
  "Subscriptions",
  "Income",
  "Transfer",
  "Other",
] as const

export type Category = (typeof categories)[number]
export type TransactionStatus =
  | "AUTO_APPROVED"
  | "NEEDS_REVIEW"
  | "MANUAL_APPROVED"

export interface Transaction {
  id: string
  importId: string
  date: string
  description: string
  merchant: string
  amount: number
  category: Category
  confidence: number
  status: TransactionStatus
  classifiedBy: "RULE" | "AI"
  recurring: boolean
}

export interface ImportRecord {
  id: string
  filename: string
  importedAt: string
  rows: number
  ruleMatches: number
  aiCalls: number
  reviewsNeeded: number
  status: "Completed" | "Processing"
}

export interface Budget {
  category: Category
  limit: number
}

export interface MerchantRule {
  id: string
  contains: string
  category: Category
}

export interface MoneyState {
  transactions: Transaction[]
  imports: ImportRecord[]
  budgets: Budget[]
  rules: MerchantRule[]
}

export const sampleStatement = `date,description,amount
2026-05-01,Salary deposit payroll,28000000
2026-05-02,Highlands Coffee Crescent Mall,-82000
2026-05-03,Grab Trip District 1,-156000
2026-05-04,Netflix monthly subscription,-260000
2026-05-05,VNPT fiber internet,-350000
2026-05-07,Shopee household order,-1468000
2026-05-08,NAPAS FT NGUYEN VAN A,-6500000
2026-05-10,Foreign exchange fee,-99000
2026-05-11,Pharmacity,-415000
2026-05-12,Lotte Cinema,-280000
2026-05-15,Apple iCloud 200GB,-69000
2026-05-17,Xanh SM,-122000
2026-05-18,Phuc Long Tea,-74000
2026-05-20,MM Mega Market,-2260000`

export const defaultBudgets: Budget[] = [
  { category: "Food", limit: 3000000 },
  { category: "Transport", limit: 1800000 },
  { category: "Shopping", limit: 3500000 },
  { category: "Entertainment", limit: 1000000 },
  { category: "Subscriptions", limit: 750000 },
]

export function createSeedState(): MoneyState {
  return {
    transactions: [],
    imports: [],
    budgets: defaultBudgets,
    rules: [],
  }
}

export function summarize(transactions: Transaction[]) {
  const income = transactions
    .filter((txn) => txn.amount > 0)
    .reduce((total, txn) => total + txn.amount, 0)
  const spend = Math.abs(
    transactions
      .filter((txn) => txn.amount < 0)
      .reduce((total, txn) => total + txn.amount, 0)
  )
  const byCategory = categories
    .map((category) => ({
      category,
      amount: Math.abs(
        transactions
          .filter((txn) => txn.category === category && txn.amount < 0)
          .reduce((total, txn) => total + txn.amount, 0)
      ),
      count: transactions.filter((txn) => txn.category === category).length,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  return {
    income,
    spend,
    net: income - spend,
    reviewCount: transactions.filter((txn) => txn.status === "NEEDS_REVIEW")
      .length,
    byCategory,
  }
}

export function formatCurrency(value: number, locale: "vi" | "en") {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value)
}
