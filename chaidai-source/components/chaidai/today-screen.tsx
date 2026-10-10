'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { ChevronRight, Flame, Pencil, PiggyBank, ReceiptText, Shield, Snowflake, Trash2, TriangleAlert } from 'lucide-react'
import { baht } from '@/lib/budget'
import { cn } from '@/lib/utils'
import { levelFromXp } from './catalog'
import { PAGE } from './fields'
import { mascotLine, useChaiDai } from './store'

export function TodayScreen() {
  const { state, budget, tax, taxReserve, today, todayKey, setTab, openAdd, sendNudge, markNoSpend, removeTransaction, categoryOf, savingsTotal } = useChaiDai()
  const nudged = useRef(false)

  useEffect(() => {
    if (nudged.current || state.loggedToday) return
    nudged.current = true
    const t = setTimeout(() => sendNudge(), 3500)
    return () => clearTimeout(t)
  }, [sendNudge, state.loggedToday])

  const spent = budget.spentToday
  const hasBudget = budget.dailyBudget > 0
  const ratio = hasBudget ? budget.safeToday / budget.dailyBudget : spent > 0 ? -1 : 0
  const { mood, line } = mascotLine(state.profile.tone, ratio)
  const status = mood === 'happy' ? 'text-primary' : mood === 'worried' ? 'text-warning' : 'text-destructive'
  const barSolid = mood === 'happy' ? 'bg-primary' : mood === 'worried' ? 'bg-warning' : 'bg-destructive'
  const barSoft = mood === 'happy' ? 'bg-primary/20' : mood === 'worried' ? 'bg-warning/20' : 'bg-destructive/20'

  const spentPct = hasBudget ? Math.min(100, (spent / budget.dailyBudget) * 100) : spent > 0 ? 100 : 0
  const over = hasBudget ? spent > budget.dailyBudget : spent > 0
  const leftAmt = Math.max(0, budget.dailyBudget - spent)
  const overAmt = Math.max(0, spent - budget.dailyBudget)

  const todayTx = state.transactions.filter((t) => t.date === todayKey)
  const level = levelFromXp(state.xp)
  const dateLabel = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }).format(today)

  return (
    <div className={PAGE}>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{dateLabel}</p>
          <p className="text-sm font-semibold">
            Lv.{level.level} {level.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTab('me')}
          className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5"
          aria-label={`Streak ${state.streak} วัน`}
        >
          <Flame className={cn('size-4', state.loggedToday ? 'fill-warning text-warning' : 'text-muted-foreground')} />
          <span className="font-display text-sm font-bold tabular-nums">{state.streak}</span>
          <span className="text-xs text-muted-foreground">วัน</span>
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="sts-label" className="rounded-[2rem] bg-card p-6">
            <p id="sts-label" className="text-sm text-muted-foreground">
              วันนี้ใช้ได้อีก
            </p>
            <p className={cn('font-display text-6xl font-bold tracking-tight tabular-nums transition-colors', status)}>
              {budget.safeToday < 0 ? '−' : ''}฿{baht(Math.abs(budget.safeToday))}
            </p>

            <div
              className={cn('mt-4 flex h-3 w-full overflow-hidden rounded-full', barSoft)}
              role="progressbar"
              aria-label="งบวันนี้ที่ใช้ไปแล้ว"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(spentPct)}
            >
              <div className={cn('h-full rounded-full transition-all duration-700', barSolid)} style={{ width: `${spentPct}%` }} />
            </div>
            <div className="mt-2 flex items-start justify-between gap-3 text-xs tabular-nums">
              <span className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', barSolid)} />
                <span className="text-muted-foreground">ใช้ไป</span>
                <span className="font-semibold text-foreground">฿{baht(spent)}</span>
                <span className="text-muted-foreground">({Math.round(spentPct)}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', barSoft)} />
                <span className="text-muted-foreground">{over ? 'เกินงบ' : 'เหลือ'}</span>
                <span className={cn('font-semibold', over ? 'text-destructive' : 'text-foreground')}>฿{baht(over ? overAmt : leftAmt)}</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">งบวันนี้ ฿{baht(budget.dailyBudget)}</p>

            {budget.pool <= 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                ค่าบิล เงินออม และภาษี รวมกันเกินรายได้ งบรายวันจึงเป็น 0 ลองปรับที่หน้า “ฉัน”
              </p>
            )}

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-xl">
                <Image src="/images/nong-keb.png" alt="" fill className="object-cover" />
              </div>
              <p className="text-pretty text-sm font-medium">{`“${line}”`}</p>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2" aria-label="สรุปเดือนนี้">
            <Stat icon={<Shield className="size-4 text-info" />} label="เหลือทั้งเดือน" value={`฿${baht(budget.monthRemaining)}`} sub={`อีก ${budget.daysLeft} วัน`} />
            <Stat
              icon={<PiggyBank className="size-4 text-chart-5" />}
              label={savingsTotal > 0 ? 'เงินออมรวม' : 'เป้าออม/เดือน'}
              value={`฿${baht(savingsTotal > 0 ? savingsTotal : state.profile.savingsTarget)}`}
              sub={state.profile.goalName}
            />
            <Stat
              icon={<ReceiptText className="size-4 text-warning" />}
              label="กันภาษี"
              value={`฿${baht(taxReserve)}`}
              sub={state.profile.incomeType === 'salary' ? 'นายจ้างหักให้แล้ว' : '/เดือน'}
            />
          </section>

          <button
            type="button"
            onClick={() => setTab('tax')}
            className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left"
          >
            <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-warning/15 text-warning">
              <span className="font-display text-lg font-bold leading-none">{Math.round(tax.marginalRate * 100)}%</span>
              <span className="text-[10px]">ฐานภาษี</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Tax Health</p>
              <p className="text-xs text-muted-foreground">
                {tax.balance > 0
                  ? `ต้องจ่ายเพิ่มประมาณ ฿${baht(tax.balance)} — ดูวิธีลดได้`
                  : tax.balance < 0
                    ? `คาดว่าได้คืน ฿${baht(-tax.balance)}`
                    : 'ยังไม่ต้องเสียภาษีเพิ่ม'}
              </p>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
        </div>

        <section aria-labelledby="today-list">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="today-list" className="text-sm font-semibold">
              รายการวันนี้
            </h2>
            <span className="text-xs text-muted-foreground">{todayTx.length} รายการ</span>
          </div>
          {todayTx.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-5 text-center">
              <p className="text-sm text-muted-foreground">ยังไม่ได้บันทึกวันนี้ บันทึกเพื่อรักษาไฟ Streak</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => openAdd()}
                  className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                >
                  บันทึกรายการ
                </button>
                <button
                  type="button"
                  onClick={markNoSpend}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-semibold"
                >
                  <Snowflake className="size-4 text-info" /> ไม่ได้ใช้เงินเลย
                </button>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayTx.map((t) => {
                const c = categoryOf(t.categoryId)
                const Icon = c.icon
                const income = t.type === 'income'
                return (
                  <li key={t.id} className="group flex items-center gap-3 rounded-2xl bg-card p-3 animate-in fade-in slide-in-from-top-2">
                    {t.slip ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.slip} alt="สลิป" className="size-10 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `color-mix(in oklab, ${c.color} 18%, transparent)`, color: c.color }}
                      >
                        <Icon className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.note || c.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.label} · {t.time}
                      </p>
                    </div>
                    <span className={cn('font-display font-semibold tabular-nums', income && 'text-primary')}>
                      {income ? '+' : '−'}
                      {baht(t.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openAdd({ editId: t.id, date: t.date })}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label={`แก้ไข ${t.note || c.label}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTransaction(t.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      aria-label={`ลบ ${t.note || c.label}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-card p-3">
      {icon}
      <p className="mt-2 text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-display text-base font-bold tabular-nums">{value}</p>
      <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
    </div>
  )
}
