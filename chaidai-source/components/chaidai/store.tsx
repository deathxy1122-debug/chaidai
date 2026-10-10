'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { type Bill, computeBudget, dateKey, parseKey, type Transaction, type TxType } from '@/lib/budget'
import { type Allowances, computeTax, type Deductions, EMPTY_ALLOWANCES, EMPTY_DEDUCTIONS, type IncomeType } from '@/lib/tax'
import { CATEGORIES, type Category, type CustomCategory, resolveCategory } from './catalog'

export type Tone = 'polite' | 'cheeky' | 'savage'
export type Tab = 'today' | 'insights' | 'tax' | 'me'
export type SavingsKind = 'bank' | 'fund' | 'other'
export type SavingsAccount = { id: string; name: string; kind: SavingsKind; amount: number }

export type Profile = {
  income: number
  incomeType: IncomeType
  occupation: string
  savingsTarget: number
  goalName: string
  tone: Tone
  reminderTime: string
}

type Push = { id: number; title: string; body: string; action?: 'add' | 'tax' }

type State = {
  onboarded: boolean
  profile: Profile
  bills: Bill[]
  deductions: Deductions
  allowances: Allowances
  transactions: Transaction[]
  savings: SavingsAccount[]
  customCategories: CustomCategory[]
  noSpendDays: string[]
  streak: number
  lastLogDate: string | null
  freezeTokens: number
  xp: number
  badges: string[]
}

export type NewTx = {
  amount: number
  categoryId: string
  note: string
  date?: string
  type?: TxType
  slip?: string
}

const STORAGE_KEY = 'chaidai:v2'

const DEFAULT_PROFILE: Profile = {
  income: 45_000,
  incomeType: 'freelance',
  occupation: '',
  savingsTarget: 9_000,
  goalName: 'เที่ยวญี่ปุ่น',
  tone: 'cheeky',
  reminderTime: '20:00',
}

export const DEFAULT_BILLS: Bill[] = [
  { id: 'rent', name: 'ค่าหอ/ค่าเช่า', icon: 'rent', amount: 6500 },
  { id: 'electric', name: 'ค่าไฟ', icon: 'electric', amount: 900 },
  { id: 'water', name: 'ค่าน้ำ', icon: 'water', amount: 150 },
  { id: 'phone', name: 'ค่าโทรศัพท์', icon: 'phone', amount: 499 },
  { id: 'internet', name: 'อินเทอร์เน็ต', icon: 'internet', amount: 599 },
]

function defaultState(): State {
  return {
    onboarded: false,
    profile: DEFAULT_PROFILE,
    bills: DEFAULT_BILLS,
    deductions: EMPTY_DEDUCTIONS,
    allowances: EMPTY_ALLOWANCES,
    transactions: [],
    savings: [],
    customCategories: [],
    noSpendDays: [],
    streak: 6,
    lastLogDate: null,
    freezeTokens: 1,
    xp: 340,
    badges: ['first-step'],
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidTx(t: unknown): t is Transaction {
  if (!t || typeof t !== 'object') return false
  const x = t as Transaction
  return (
    typeof x.id === 'string' &&
    !x.id.startsWith('seed-') &&
    typeof x.amount === 'number' &&
    Number.isFinite(x.amount) &&
    x.amount > 0 &&
    typeof x.date === 'string' &&
    DATE_RE.test(x.date) &&
    typeof x.categoryId === 'string'
  )
}

function daysBetween(a: string, b: string) {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000)
}

function loadState(todayKey: string): State | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<State>
    const base = defaultState()
    const s: State = {
      ...base,
      ...p,
      profile: { ...base.profile, ...(p.profile ?? {}) },
      deductions: { ...base.deductions, ...(p.deductions ?? {}) },
      allowances: { ...base.allowances, ...(p.allowances ?? {}) },
      bills: Array.isArray(p.bills) ? p.bills : base.bills,
      transactions: Array.isArray(p.transactions) ? p.transactions.filter(isValidTx) : [],
      savings: Array.isArray(p.savings) ? p.savings : [],
      customCategories: Array.isArray(p.customCategories) ? p.customCategories : [],
      noSpendDays: Array.isArray(p.noSpendDays) ? p.noSpendDays.filter((d) => typeof d === 'string' && DATE_RE.test(d)) : [],
      badges: Array.isArray(p.badges) ? p.badges : base.badges,
    }
    if (s.lastLogDate) {
      const gap = daysBetween(s.lastLogDate, todayKey)
      if (gap > 1) {
        if (gap === 2 && s.freezeTokens > 0) {
          s.freezeTokens -= 1
          const y = parseKey(todayKey)
          y.setDate(y.getDate() - 1)
          s.lastLogDate = dateKey(y)
        } else {
          s.streak = 0
        }
      }
    }
    return s
  } catch {
    return null
  }
}

function persist(s: State) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, transactions: s.transactions.map(({ slip: _slip, ...t }) => t) }))
    } catch {
      /* storage unavailable: keep working in memory */
    }
  }
}

const NUDGES: Record<Tone, { title: string; body: string }> = {
  polite: { title: 'ถึงเวลาบันทึกแล้วนะ', body: 'วันนี้ใช้อะไรไปบ้าง ใช้เวลาแค่ 10 วินาทีเท่านั้น' },
  cheeky: { title: 'ทุ่มตรงแล้ว!', body: 'วันนี้ใช้อะไรไปบ้าง มาบันทึกใน 10 วินาทีกัน ไฟ Streak รออยู่นะ' },
  savage: { title: 'อย่ามาทำเป็นลืม', body: 'กระเป๋าตังค์คุณจำได้นะว่าวันนี้จ่ายอะไรไป บันทึกเดี๋ยวนี้!' },
}

type Ctx = ReturnType<typeof useChaiDaiState>
const ChaiDaiContext = createContext<Ctx | null>(null)

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function useChaiDaiState() {
  const [today] = useState(() => new Date())
  const todayKey = dateKey(today)
  const [raw, setRaw] = useState<State>(() => loadState(todayKey) ?? defaultState())
  const [tab, setTab] = useState<Tab>('today')
  const [addSheet, setAddSheet] = useState<{ date: string; editId?: string } | null>(null)
  const [dayOpen, setDayOpen] = useState<string | null>(null)
  const [push, setPush] = useState<Push | null>(null)
  const [celebration, setCelebration] = useState<string | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    persist(raw)
  }, [raw])

  const state = useMemo(() => ({ ...raw, loggedToday: raw.lastLogDate === todayKey }), [raw, todayKey])

  const annualIncome = state.profile.income * 12
  const tax = useMemo(
    () => computeTax(annualIncome, state.profile.incomeType, state.deductions, state.allowances),
    [annualIncome, state.profile.incomeType, state.deductions, state.allowances],
  )
  const taxReserve = Math.max(0, Math.round(tax.balance / 12))

  const budget = useMemo(
    () =>
      computeBudget({
        income: state.profile.income,
        bills: state.bills,
        savingsTarget: state.profile.savingsTarget,
        taxReserve,
        transactions: state.transactions,
        today,
      }),
    [state.profile.income, state.bills, state.profile.savingsTarget, taxReserve, state.transactions, today],
  )

  const categories: Category[] = useMemo(
    () => [...CATEGORIES, ...state.customCategories.map((c) => resolveCategory(c.id, state.customCategories))],
    [state.customCategories],
  )
  const categoryOf = useCallback((id: string) => resolveCategory(id, state.customCategories), [state.customCategories])
  const savingsTotal = useMemo(() => state.savings.reduce((s, a) => s + a.amount, 0), [state.savings])

  const showPush = useCallback((p: Omit<Push, 'id'>) => {
    if (pushTimer.current) clearTimeout(pushTimer.current)
    setPush({ ...p, id: Date.now() })
    pushTimer.current = setTimeout(() => setPush(null), 7000)
  }, [])

  const dismissPush = useCallback(() => setPush(null), [])

  const sendNudge = useCallback(
    (tone?: Tone) => showPush({ ...NUDGES[tone ?? state.profile.tone], action: 'add' }),
    [showPush, state.profile.tone],
  )

  const registerLog = useCallback(
    (s: State, extraXp: number, extraBadges: string[] = []): State => {
      const badges = new Set(s.badges)
      let streak = s.streak
      let xp = s.xp + extraXp
      if (s.lastLogDate !== todayKey) {
        streak += 1
        xp += 30
        if (streak >= 7) badges.add('streak-7')
        if (streak >= 30) badges.add('streak-30')
      }
      extraBadges.forEach((b) => badges.add(b))
      const unlocked = [...badges].find((b) => !s.badges.includes(b))
      if (unlocked) setTimeout(() => setCelebration(unlocked), 450)
      return { ...s, streak, xp, lastLogDate: todayKey, badges: [...badges] }
    },
    [todayKey],
  )

  const addTransactions = useCallback(
    (items: NewTx[]) => {
      const valid = items.filter((i) => i.amount > 0)
      if (!valid.length) return
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      setRaw((s) => {
        const created: Transaction[] = valid.map((it, i) => ({
          id: `tx-${now.getTime()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          amount: it.amount,
          categoryId: it.categoryId,
          note: it.note,
          date: it.date ?? todayKey,
          time,
          type: it.type ?? 'expense',
          ...(it.slip ? { slip: it.slip } : {}),
        }))
        const expenseDates = new Set(created.filter((c) => c.type !== 'income').map((c) => c.date))
        const next: State = {
          ...s,
          transactions: [...created, ...s.transactions],
          noSpendDays: s.noSpendDays.filter((d) => !expenseDates.has(d)),
        }
        return created.some((c) => c.date === todayKey) ? registerLog(next, 10 * created.length) : next
      })
    },
    [todayKey, registerLog],
  )

  const addTransaction = useCallback((tx: NewTx) => addTransactions([tx]), [addTransactions])

  const updateTransaction = useCallback((id: string, patch: Partial<Omit<Transaction, 'id'>>) => {
    setRaw((s) => {
      const target = s.transactions.find((t) => t.id === id)
      if (!target) return s
      const merged = { ...target, ...patch }
      return {
        ...s,
        transactions: s.transactions.map((t) => (t.id === id ? merged : t)),
        noSpendDays: merged.type === 'income' ? s.noSpendDays : s.noSpendDays.filter((d) => d !== merged.date),
      }
    })
  }, [])

  const removeTransaction = useCallback(
    (id: string) => setRaw((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) })),
    [],
  )

  const markNoSpend = useCallback(
    () => setRaw((s) => registerLog({ ...s, noSpendDays: s.noSpendDays.includes(todayKey) ? s.noSpendDays : [...s.noSpendDays, todayKey] }, 20, ['no-spend'])),
    [registerLog, todayKey],
  )

  const setNoSpendDay = useCallback(
    (date: string, on: boolean) =>
      setRaw((s) => ({
        ...s,
        noSpendDays: on ? (s.noSpendDays.includes(date) ? s.noSpendDays : [...s.noSpendDays, date]) : s.noSpendDays.filter((d) => d !== date),
      })),
    [],
  )

  const addCategory = useCallback((label: string, color: string, icon: string) => {
    const id = uid('cat')
    setRaw((s) => ({ ...s, customCategories: [...s.customCategories, { id, label: label.trim().slice(0, 20), color, icon }] }))
    return id
  }, [])

  const removeCategory = useCallback(
    (id: string) => setRaw((s) => ({ ...s, customCategories: s.customCategories.filter((c) => c.id !== id) })),
    [],
  )

  const saveSaving = useCallback((acc: Omit<SavingsAccount, 'id'> & { id?: string }) => {
    setRaw((s) => {
      const clean = { ...acc, name: acc.name.trim().slice(0, 40), amount: Math.max(0, acc.amount) }
      if (!clean.name) return s
      if (clean.id) return { ...s, savings: s.savings.map((a) => (a.id === clean.id ? ({ ...clean, id: a.id } as SavingsAccount) : a)) }
      return { ...s, savings: [...s.savings, { ...clean, id: uid('sv') } as SavingsAccount] }
    })
  }, [])

  const removeSaving = useCallback((id: string) => setRaw((s) => ({ ...s, savings: s.savings.filter((a) => a.id !== id) })), [])

  const completeOnboarding = useCallback((profile: Profile, bills: Bill[]) => {
    setRaw((s) => ({ ...s, onboarded: true, profile, bills }))
    setTab('today')
  }, [])

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => setRaw((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    [],
  )

  const updateBills = useCallback((bills: Bill[]) => setRaw((s) => ({ ...s, bills })), [])

  const setAllowances = useCallback(
    (patch: Partial<Allowances>) => setRaw((s) => ({ ...s, allowances: { ...s.allowances, ...patch } })),
    [],
  )

  const applyDeductions = useCallback((extra: Partial<Deductions>) => {
    setRaw((s) => {
      const deductions = { ...s.deductions }
      for (const [k, v] of Object.entries(extra)) deductions[k as keyof Deductions] += v ?? 0
      const badges = s.badges.includes('tax-hunter') ? s.badges : [...s.badges, 'tax-hunter']
      if (!s.badges.includes('tax-hunter')) setTimeout(() => setCelebration('tax-hunter'), 450)
      return { ...s, deductions, badges, xp: s.xp + 50 }
    })
  }, [])

  const restart = useCallback(() => {
    setRaw((s) => ({ ...s, onboarded: false }))
  }, [])

  const resetAll = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setRaw(defaultState())
    setTab('today')
    setPush(null)
    setAddSheet(null)
    setDayOpen(null)
    setCelebration(null)
  }, [])

  const openAdd = useCallback((opts?: { date?: string; editId?: string }) => setAddSheet({ date: opts?.date ?? todayKey, editId: opts?.editId }), [todayKey])
  const closeAdd = useCallback(() => setAddSheet(null), [])
  const setAddOpen = useCallback((open: boolean) => (open ? openAdd() : closeAdd()), [openAdd, closeAdd])

  return {
    state,
    today,
    todayKey,
    tax,
    taxReserve,
    budget,
    annualIncome,
    categories,
    categoryOf,
    savingsTotal,
    tab,
    setTab,
    addOpen: addSheet !== null,
    addSheet,
    openAdd,
    closeAdd,
    setAddOpen,
    dayOpen,
    openDay: setDayOpen,
    closeDay: () => setDayOpen(null),
    push,
    showPush,
    dismissPush,
    sendNudge,
    celebration,
    clearCelebration: () => setCelebration(null),
    addTransaction,
    addTransactions,
    updateTransaction,
    markNoSpend,
    setNoSpendDay,
    removeTransaction,
    addCategory,
    removeCategory,
    saveSaving,
    removeSaving,
    completeOnboarding,
    updateProfile,
    updateBills,
    setAllowances,
    applyDeductions,
    restart,
    resetAll,
  }
}

export function ChaiDaiProvider({ children }: { children: React.ReactNode }) {
  const value = useChaiDaiState()
  return <ChaiDaiContext.Provider value={value}>{children}</ChaiDaiContext.Provider>
}

export function useChaiDai() {
  const ctx = useContext(ChaiDaiContext)
  if (!ctx) throw new Error('useChaiDai must be used within ChaiDaiProvider')
  return ctx
}

export function mascotLine(tone: Tone, ratio: number) {
  const mood = ratio > 0.5 ? 'happy' : ratio > 0 ? 'worried' : 'shocked'
  const lines = {
    polite: { happy: 'งบยังเหลือเยอะ ใช้ชีวิตได้สบายๆ วันนี้', worried: 'ใกล้ถึงลิมิตแล้ว ค่อยๆ ใช้นะ', shocked: 'วันนี้เกินงบแล้ว พรุ่งนี้มาปรับกัน' },
    cheeky: { happy: 'ยังไหวๆ ชาบูได้อีกมื้อ', worried: 'เบรกก่อนน้า ข้าวเย็นยังไม่ได้กินเลย', shocked: 'โอ๊ย! เกินงบแล้ว น้องเก็บเป็นลม' },
    savage: { happy: 'เหลือเยอะ แต่อย่าเหลิง', worried: 'ใช้อีกบาทเดียวจะโดนดุ', shocked: 'เกินงบ! พรุ่งนี้กินมาม่าไปเลย' },
  }
  return { mood, line: lines[tone][mood] } as const
}
