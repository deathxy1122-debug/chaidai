'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Landmark, Pencil, PiggyBank, Plus, Trash2, TrendingUp, X } from 'lucide-react'
import { baht, dateKey, daysInMonth } from '@/lib/budget'
import { cn } from '@/lib/utils'
import { MoneyInput, PAGE } from './fields'
import { type SavingsAccount, type SavingsKind, useChaiDai } from './store'

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
type View = 'month' | 'year' | 'savings'
const VIEWS: { id: View; label: string }[] = [
  { id: 'month', label: 'รายเดือน' },
  { id: 'year', label: 'รายปี' },
  { id: 'savings', label: 'เงินออม' },
]

export function InsightsScreen() {
  const [view, setView] = useState<View>('month')

  return (
    <div className={PAGE}>
      <header className="mb-4 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">ภาพรวม</h1>
        <div className="flex rounded-full bg-card p-1" role="tablist" aria-label="มุมมอง">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn('rounded-full px-3.5 py-1.5 text-xs font-semibold', view === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
            >
              {v.label}
            </button>
          ))}
        </div>
      </header>

      {view === 'month' && <MonthView />}
      {view === 'year' && <YearView />}
      {view === 'savings' && <SavingsView />}
    </div>
  )
}

function MonthView() {
  const { state, budget, today, todayKey, openDay, categories } = useChaiDai()
  const [offset, setOffset] = useState(0)

  const viewDate = useMemo(() => new Date(today.getFullYear(), today.getMonth() + offset, 1), [today, offset])
  const monthPrefix = dateKey(viewDate).slice(0, 7)
  const isCurrent = offset === 0
  const totalDays = daysInMonth(viewDate)
  const passedDays = isCurrent ? today.getDate() : totalDays

  const { byDay, hasTx, byCategory, total } = useMemo(() => {
    const byDay = new Map<number, number>()
    const hasTx = new Set<number>()
    const byCategory = new Map<string, number>()
    let total = 0
    for (const t of state.transactions) {
      if (!t.date.startsWith(monthPrefix)) continue
      const d = Number(t.date.slice(8))
      hasTx.add(d)
      if (t.type === 'income') continue
      byDay.set(d, (byDay.get(d) ?? 0) + t.amount)
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amount)
      total += t.amount
    }
    return { byDay, hasTx, byCategory, total }
  }, [state.transactions, monthPrefix])

  const noSpend = useMemo(() => new Set(state.noSpendDays.filter((d) => d.startsWith(monthPrefix)).map((d) => Number(d.slice(8)))), [state.noSpendDays, monthPrefix])

  const firstWeekday = viewDate.getDay()
  const monthLabel = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(viewDate)
  const limitDay = isCurrent ? passedDays - 1 : passedDays
  const underDays = Array.from({ length: limitDay }, (_, i) => i + 1).filter((day) => (hasTx.has(day) || noSpend.has(day)) && (byDay.get(day) ?? 0) <= budget.averageDaily).length

  const keyOf = (day: number) => `${monthPrefix}-${String(day).padStart(2, '0')}`

  const cellClass = (day: number) => {
    if (day > passedDays) return 'bg-secondary/40 text-muted-foreground/40'
    const spent = byDay.get(day) ?? 0
    const recorded = hasTx.has(day) || noSpend.has(day)
    const isToday = isCurrent && day === passedDays
    if (!recorded) return isToday ? 'border border-dashed border-primary text-primary' : 'bg-secondary/60 text-muted-foreground'
    if (spent === 0) return hasTx.has(day) && !noSpend.has(day) ? 'bg-accent text-foreground' : 'bg-info/25 text-info'
    if (spent <= budget.averageDaily) return 'bg-primary/80 text-primary-foreground'
    if (spent <= budget.averageDaily * 1.2) return 'bg-warning/80 text-primary-foreground'
    return 'bg-destructive/80 text-primary-foreground'
  }

  const sortedCats = categories
    .map((c) => ({ ...c, value: byCategory.get(c.id) ?? 0 }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
  const unknown = [...byCategory.entries()].filter(([id]) => !categories.some((c) => c.id === id))
  const unknownTotal = unknown.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <section aria-labelledby="heatmap" className="rounded-[2rem] bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setOffset((o) => Math.max(-24, o - 1))} className="rounded-full p-1.5 hover:bg-secondary" aria-label="เดือนก่อนหน้า">
              <ChevronLeft className="size-4" />
            </button>
            <h2 id="heatmap" className="min-w-28 text-center font-semibold">
              {monthLabel}
            </h2>
            <button type="button" onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={isCurrent} className="rounded-full p-1.5 hover:bg-secondary disabled:opacity-30" aria-label="เดือนถัดไป">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">อยู่ในงบ {underDays} วัน</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-[10px] text-muted-foreground">
              {w}
            </span>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <span key={`e-${i}`} />
          ))}
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
            const future = day > passedDays
            const cls = cn('flex aspect-square items-center justify-center rounded-lg font-display text-xs font-semibold', cellClass(day))
            return future ? (
              <span key={day} className={cls}>
                {day}
              </span>
            ) : (
              <button
                key={day}
                type="button"
                onClick={() => openDay(keyOf(day))}
                className={cn(cls, 'transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring', keyOf(day) === todayKey && 'ring-1 ring-primary/60')}
                title={`฿${baht(byDay.get(day) ?? 0)}`}
                aria-label={`วันที่ ${day} ใช้ไป ${baht(byDay.get(day) ?? 0)} บาท ดูและแก้ไขรายการ`}
              >
                {day}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <Legend className="bg-primary" label="อยู่ในงบ" />
          <Legend className="bg-warning" label="เกินนิดหน่อย" />
          <Legend className="bg-destructive" label="เกินมาก" />
          <Legend className="bg-info/60" label="No-Spend Day" />
          <Legend className="bg-secondary" label="ยังไม่ได้บันทึก" />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">แตะที่วันเพื่อดู แก้ไข หรือเพิ่มรายการย้อนหลัง</p>
      </section>

      <section aria-labelledby="cats" className="rounded-[2rem] bg-card p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="cats" className="font-semibold">
            ใช้ไปตามหมวด
          </h2>
          <span className="font-display text-sm font-bold tabular-nums">฿{baht(total)}</span>
        </div>
        {total === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">ยังไม่มีรายจ่ายที่บันทึกในเดือนนี้</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sortedCats.map((c) => {
              const Icon = c.icon
              return (
                <li key={c.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" style={{ color: c.color }} />
                      {c.label}
                    </span>
                    <span className="font-display tabular-nums">
                      ฿{baht(c.value)} <span className="text-xs text-muted-foreground">({Math.round((c.value / total) * 100)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full" style={{ width: `${(c.value / total) * 100}%`, backgroundColor: c.color }} />
                  </div>
                </li>
              )
            })}
            {unknownTotal > 0 && (
              <li>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">อื่นๆ (หมวดที่ลบแล้ว)</span>
                  <span className="font-display tabular-nums">฿{baht(unknownTotal)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-muted-foreground" style={{ width: `${(unknownTotal / total) * 100}%` }} />
                </div>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  )
}

function YearView() {
  const { state, today, annualIncome, tax } = useChaiDai()
  const ytdIncome = state.profile.income * (today.getMonth() + 1)
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <YearCard label="รายได้สะสมถึงเดือนนี้" value={`฿${baht(ytdIncome)}`} sub={`ประมาณการทั้งปี ฿${baht(annualIncome)}`} progress={ytdIncome / annualIncome} color="bg-foreground" />
      <YearCard
        label="ออมสะสม"
        value={`฿${baht(state.profile.savingsTarget * (today.getMonth() + 1))}`}
        sub={`เป้าหมายทั้งปี ฿${baht(state.profile.savingsTarget * 12)} · ${state.profile.goalName}`}
        progress={(today.getMonth() + 1) / 12}
        color="bg-chart-5"
      />
      <YearCard label="ภาษีทั้งปีโดยประมาณ" value={`฿${baht(tax.tax)}`} sub={`ฐานภาษี ${Math.round(tax.marginalRate * 100)}% จากสูงสุด 35% · เงินได้สุทธิ ฿${baht(tax.net)}`} progress={tax.marginalRate / 0.35} color="bg-warning" />
      <div className="rounded-[2rem] border border-dashed border-border p-5 text-center">
        <p className="font-display text-sm font-bold tracking-widest text-primary">CHAIDAI WRAPPED</p>
        <p className="mt-1 text-sm text-muted-foreground">สรุปปีของคุณแบบแชร์ลงโซเชียลได้ ปลดล็อกเดือนธันวาคม</p>
      </div>
    </section>
  )
}

const KIND_META: Record<SavingsKind, { label: string; color: string }> = {
  bank: { label: 'ธนาคาร', color: 'var(--chart-2)' },
  fund: { label: 'กองทุน', color: 'var(--chart-1)' },
  other: { label: 'อื่นๆ', color: 'var(--chart-5)' },
}
const ACCOUNT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-5)', 'var(--chart-4)']

const pct = (v: number, total: number) => (total > 0 ? (v / total) * 100 : 0)
const pctLabel = (v: number) => `${v >= 10 || v === 0 ? Math.round(v) : v.toFixed(1)}%`

function SavingsView() {
  const { state, saveSaving, removeSaving, savingsTotal } = useChaiDai()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const sorted = [...state.savings].sort((a, b) => b.amount - a.amount)
  const byKind = (['bank', 'fund', 'other'] as SavingsKind[])
    .map((k) => ({ kind: k, total: state.savings.filter((a) => a.kind === k).reduce((s, a) => s + a.amount, 0), count: state.savings.filter((a) => a.kind === k).length }))
    .filter((g) => g.count > 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <section className="rounded-[2rem] bg-card p-5" aria-labelledby="sv-total">
        <p id="sv-total" className="flex items-center gap-2 text-sm text-muted-foreground">
          <PiggyBank className="size-4 text-chart-5" /> เงินออมรวมทั้งหมด
        </p>
        <p className="font-display text-4xl font-bold tabular-nums">฿{baht(savingsTotal)}</p>
        <p className="text-xs text-muted-foreground">เป้าหมาย: {state.profile.goalName} · ออมเดือนละ ฿{baht(state.profile.savingsTarget)}</p>

        {savingsTotal > 0 ? (
          <>
            <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-secondary" role="img" aria-label="สัดส่วนเงินออมแยกตามบัญชี">
              {sorted.map((a, i) => (
                <div key={a.id} className="h-full" style={{ width: `${pct(a.amount, savingsTotal)}%`, backgroundColor: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }} />
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {byKind.map((g) => (
                <li key={g.kind} className="rounded-2xl bg-secondary p-3">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ backgroundColor: KIND_META[g.kind].color }} />
                    {KIND_META[g.kind].label} ({g.count})
                  </p>
                  <p className="font-display text-base font-bold tabular-nums">฿{baht(g.total)}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{pctLabel(pct(g.total, savingsTotal))} ของทั้งหมด</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            ยังไม่มีข้อมูลเงินออม เพิ่มบัญชีธนาคารหรือกองทุนเพื่อดูยอดรวมและสัดส่วน
          </p>
        )}
      </section>

      <section aria-labelledby="sv-list" className="flex flex-col gap-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 id="sv-list" className="text-sm font-semibold">
            แยกตามกองทุน/ธนาคาร
          </h2>
          {!adding && (
            <button type="button" onClick={() => { setAdding(true); setEditing(null) }} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              <Plus className="size-3.5" /> เพิ่ม
            </button>
          )}
        </div>

        {adding && <SavingsForm onCancel={() => setAdding(false)} onSave={(a) => { saveSaving(a); setAdding(false) }} />}

        <ul className="flex flex-col gap-2">
          {sorted.map((a, i) =>
            editing === a.id ? (
              <li key={a.id}>
                <SavingsForm initial={a} onCancel={() => setEditing(null)} onSave={(x) => { saveSaving({ ...x, id: a.id }); setEditing(null) }} />
              </li>
            ) : (
              <li key={a.id} className="rounded-2xl bg-card p-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in oklab, ${ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]} 18%, transparent)`, color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}>
                    {a.kind === 'fund' ? <TrendingUp className="size-5" /> : a.kind === 'bank' ? <Landmark className="size-5" /> : <PiggyBank className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{KIND_META[a.kind].label}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-semibold tabular-nums">฿{baht(a.amount)}</p>
                    <p className="text-xs font-semibold tabular-nums" style={{ color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}>
                      {pctLabel(pct(a.amount, savingsTotal))}
                    </p>
                  </div>
                  <button type="button" onClick={() => { setEditing(a.id); setAdding(false) }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={`แก้ไข ${a.name}`}>
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => removeSaving(a.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive" aria-label={`ลบ ${a.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${pct(a.amount, savingsTotal)}%`, backgroundColor: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }} />
                </div>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  )
}

function SavingsForm({ initial, onSave, onCancel }: { initial?: SavingsAccount; onSave: (a: Omit<SavingsAccount, 'id'>) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<SavingsKind>(initial?.kind ?? 'bank')
  const [amount, setAmount] = useState(initial?.amount ?? 0)
  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-4 animate-in fade-in">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{initial ? 'แก้ไขบัญชีออม' : 'เพิ่มบัญชีออม'}</span>
        <button type="button" onClick={onCancel} className="rounded-full p-1 text-muted-foreground" aria-label="ยกเลิก">
          <X className="size-4" />
        </button>
      </div>
      <div className="mb-3 flex rounded-xl bg-secondary p-1" role="radiogroup" aria-label="ประเภท">
        {(Object.keys(KIND_META) as SavingsKind[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cn('flex-1 rounded-lg py-1.5 text-xs font-semibold', kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            {KIND_META[k].label}
          </button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder={kind === 'fund' ? 'ชื่อกองทุน เช่น RMF หุ้นไทย' : kind === 'bank' ? 'ชื่อธนาคาร/บัญชี เช่น กสิกร ออมทรัพย์' : 'ชื่อรายการ เช่น ทองคำ'}
        aria-label="ชื่อกองทุนหรือธนาคาร"
        className="h-10 w-full rounded-lg bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <label className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        ยอดเงิน (บาท)
        <MoneyInput value={amount} onChange={setAmount} label="ยอดเงินออม" className="w-40" />
      </label>
      <button type="button" disabled={!name.trim()} onClick={() => onSave({ name, kind, amount })} className="mt-3 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40">
        บันทึก
      </button>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-2.5 rounded-sm', className)} />
      {label}
    </span>
  )
}

function YearCard({ label, value, sub, progress, color }: { label: string; value: string; sub: string; progress: number; color: string }) {
  return (
    <div className="rounded-[2rem] bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}
