export type TxType = 'expense' | 'income'

export type Transaction = {
  id: string
  amount: number
  categoryId: string
  note: string
  date: string
  time: string
  type?: TxType
  slip?: string
}

export type Bill = { id: string; name: string; icon: string; amount: number }

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const BUFFER_PERCENT = 5

export function computeBudget(input: {
  income: number
  bills: Bill[]
  savingsTarget: number
  taxReserve: number
  transactions: Transaction[]
  today: Date
}) {
  const { income, bills, savingsTarget, taxReserve, transactions, today } = input
  const totalDays = daysInMonth(today)
  const daysLeft = totalDays - today.getDate() + 1
  const todayKey = dateKey(today)
  const monthPrefix = todayKey.slice(0, 7)

  const billsTotal = bills.reduce((s, b) => s + b.amount, 0)
  const buffer = Math.round((income * BUFFER_PERCENT) / 100)

  let spentBefore = 0
  let spentToday = 0
  let extraIncome = 0
  for (const t of transactions) {
    if (!t.date.startsWith(monthPrefix)) continue
    if (t.type === 'income') {
      if (t.date <= todayKey) extraIncome += t.amount
      continue
    }
    if (t.date === todayKey) spentToday += t.amount
    else if (t.date < todayKey) spentBefore += t.amount
  }

  const pool = income + extraIncome - billsTotal - savingsTarget - taxReserve - buffer
  const dailyBudget = Math.max(0, Math.floor((pool - spentBefore) / daysLeft))
  const safeToday = dailyBudget - spentToday

  return {
    billsTotal,
    buffer,
    pool,
    extraIncome,
    totalDays,
    daysLeft,
    spentBefore,
    spentToday,
    dailyBudget,
    safeToday,
    averageDaily: Math.max(0, Math.floor(pool / totalDays)),
    monthRemaining: pool - spentBefore - spentToday,
  }
}

export type BudgetResult = ReturnType<typeof computeBudget>

export const baht = (n: number) => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(Math.round(n))
