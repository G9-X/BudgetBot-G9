"use client"

import * as React from "react"

import {
  type Category,
  type MoneyState,
  createSeedState,
} from "@/lib/money-coach"

type Locale = "vi" | "en"

interface MoneyCoachContextValue {
  state: MoneyState
  locale: Locale
  hydrated: boolean
  signedIn: boolean
  setLocale: (locale: Locale) => void
  signIn: () => void
  signOut: () => void
  addImport: (filename: string, content: string) => Promise<number>
  reviewTransaction: (
    id: string,
    category: Category,
    rememberRule?: boolean
  ) => Promise<void>
  toggleRecurring: (id: string) => void
  updateBudget: (category: Category, limit: number) => void
  resetData: () => void
}

const storageKey = "money-coach-demo-state-v1"
const sessionKey = "money-coach-demo-session-v1"
const localeKey = "money-coach-locale-v1"
const API_BASE_URL = "http://127.0.0.1:8000"
const USER_ID = "demo-user"

/** Safely coerce any API shape to a plain array of transactions */
function normalizeTxns(data: unknown): MoneyState["transactions"] {
  if (Array.isArray(data)) return data as MoneyState["transactions"]
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj["transactions"])) return obj["transactions"] as MoneyState["transactions"]
  }
  return []
}

const MoneyCoachContext = React.createContext<MoneyCoachContextValue | null>(
  null
)

export function MoneyCoachProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, setState] = React.useState<MoneyState>(createSeedState)
  const [locale, setLocaleState] = React.useState<Locale>("vi")
  const [signedIn, setSignedIn] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)

  // Initial load
  React.useEffect(() => {
    queueMicrotask(() => {
      const storedLocale = window.localStorage.getItem(localeKey)
      const storedSession = window.localStorage.getItem(sessionKey)
      
      if (storedLocale === "vi" || storedLocale === "en") {
        setLocaleState(storedLocale)
      }
      setSignedIn(storedSession === "signed-in")
      
      if (storedSession !== "signed-in") {
        setHydrated(true)
        return
      }
      
      // Fetch data from backend
      fetch(`${API_BASE_URL}/transactions`, { headers: { "x-user-id": USER_ID } })
        .then((r) => {
          if (!r.ok) throw new Error("Backend failed")
          return r.json()
        })
        .then((data) => {
          const txns = normalizeTxns(data)
          setState((current) => {
            const stored = window.localStorage.getItem(storageKey)
            let localState = current
            if (stored) {
              try {
                const parsed = JSON.parse(stored) as MoneyState
                // Ensure persisted transactions is always an array
                localState = { ...parsed, transactions: normalizeTxns(parsed.transactions) }
              } catch {}
            }
            return {
              ...localState,
              transactions: txns,
            }
          })
          setHydrated(true)
        })
        .catch((err) => {
          console.error("Fetch transactions failed:", err)
          setHydrated(true)
        })
    })
  }, [])

  React.useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(state))
      window.localStorage.setItem(localeKey, locale)
      window.localStorage.setItem(
        sessionKey,
        signedIn ? "signed-in" : "signed-out"
      )
    }
  }, [hydrated, locale, signedIn, state])

  const setLocale = React.useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
  }, [])

  const signIn = React.useCallback(() => setSignedIn(true), [])
  const signOut = React.useCallback(() => setSignedIn(false), [])

  const fetchTransactions = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/transactions`, { headers: { "x-user-id": USER_ID } })
      if (!res.ok) return
      const data = await res.json()
      const txns = normalizeTxns(data)
      setState((current) => ({ ...current, transactions: txns }))
    } catch (err) {
      console.error(err)
    }
  }, [])

  const addImport = React.useCallback(async (filename: string, content: string) => {
    const file = new File([content], filename, { type: "text/csv" })
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: { "x-user-id": USER_ID },
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      const summary = await res.json()

      await fetchTransactions()
      
      setState((current) => ({
        ...current,
        imports: [summary, ...current.imports],
      }))
      return summary.rows || summary.transactions?.length || 0
    } catch (error) {
      console.error(error)
      throw new Error("UPLOAD_FAILED")
    }
  }, [fetchTransactions])

  const reviewTransaction = React.useCallback(
    async (id: string, category: Category, rememberRule = false) => {
      // Optimistic update
      setState((current) => {
        const transaction = current.transactions.find((txn) => txn.id === id)
        const newRule =
          rememberRule && transaction
            ? {
                id: `rule-${transaction.id}`,
                contains: transaction.merchant,
                category,
              }
            : null
        return {
          ...current,
          transactions: current.transactions.map((txn) =>
            txn.id === id
              ? {
                  ...txn,
                  category,
                  confidence: 1,
                  status: "MANUAL_APPROVED",
                }
              : txn
          ),
          rules: newRule
            ? [
                newRule,
                ...current.rules.filter(
                  (rule) => rule.contains !== newRule.contains
                ),
              ]
            : current.rules,
        }
      })

      // Backend call
      try {
        await fetch(`${API_BASE_URL}/transactions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
          body: JSON.stringify({ category, status: "MANUAL_APPROVED" }),
        })
        if (rememberRule) {
          const txn = state.transactions.find((t) => t.id === id)
          if (txn) {
            await fetch(`${API_BASE_URL}/rules`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
              body: JSON.stringify({ contains: txn.merchant, category }),
            })
          }
        }
      } catch (err) {
        console.error("Review transaction failed:", err)
      }
    },
    [state.transactions]
  )

  const toggleRecurring = React.useCallback((id: string) => {
    setState((current) => ({
      ...current,
      transactions: current.transactions.map((txn) =>
        txn.id === id ? { ...txn, recurring: !txn.recurring } : txn
      ),
    }))
  }, [])

  const updateBudget = React.useCallback(
    (category: Category, limit: number) => {
      setState((current) => ({
        ...current,
        budgets: current.budgets.map((budget) =>
          budget.category === category ? { ...budget, limit } : budget
        ),
      }))
    },
    []
  )

  const resetData = React.useCallback(() => setState(createSeedState()), [])

  const value = React.useMemo(
    () => ({
      state,
      locale,
      hydrated,
      signedIn,
      setLocale,
      signIn,
      signOut,
      addImport,
      reviewTransaction,
      toggleRecurring,
      updateBudget,
      resetData,
    }),
    [
      state,
      locale,
      hydrated,
      signedIn,
      setLocale,
      signIn,
      signOut,
      addImport,
      reviewTransaction,
      toggleRecurring,
      updateBudget,
      resetData,
    ]
  )

  return (
    <MoneyCoachContext.Provider value={value}>
      {children}
    </MoneyCoachContext.Provider>
  )
}

export function useMoneyCoach() {
  const context = React.useContext(MoneyCoachContext)
  if (!context) {
    throw new Error("useMoneyCoach must be used within MoneyCoachProvider")
  }
  return context
}
