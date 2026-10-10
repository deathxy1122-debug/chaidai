'use client'

import { Pencil, Plus, Snowflake, Trash2, X } from 'lucide-react'
import { baht, parseKey } from '@/lib/budget'
import { cn } from '@/lib/utils'
import { useChaiDai } from './store'

export function DaySheet() {
  const { dayOpen, closeDay, state, categoryOf, openAdd, removeTransaction, setNoSpendDay, todayKey } = useChaiDai()
  if (!dayOpen) return null

  const list = state.transactions.filter((t) => t.date === dayOpen)
  const spent = list.filter((t) => t.type !== 'income').reduce((s, t) => s + t.amount, 0)
  const earned = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const noSpend = state.noSpendDays.includes(dayOpen)
  const label = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseKey(dayOpen))
  const isToday = dayOpen === todayKey

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center md:p-6" role="dialog" aria-modal="true" aria-label={`รายการวันที่ ${label}`}>
      <button type="button" className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-in fade-in" onClick={closeDay} aria-label="ปิด" />
      <div className="no-scrollbar relative flex max-h-[85%] w-full flex-col overflow-y-auto rounded-t-[2rem] border-t border-border bg-card px-5 pt-4 pb-8 animate-in slide-in-from-bottom duration-300 md:max-w-md md:rounded-[2rem] md:border md:pb-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{isToday ? 'วันนี้' : 'ข้อมูลย้อนหลัง'}</p>
            <h2 className="text-base font-semibold">{label}</h2>
          </div>
          <button type="button" onClick={closeDay} className="rounded-full bg-secondary p-2" aria-label="ปิด">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-[11px] text-muted-foreground">เงินออก</p>
            <p className="font-display text-lg font-bold tabular-nums">−฿{baht(spent)}</p>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-[11px] text-muted-foreground">เงินเข้า</p>
            <p className="font-display text-lg font-bold tabular-nums text-primary">+฿{baht(earned)}</p>
          </div>
        </div>

        {list.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {noSpend ? 'วันนี้ทำเครื่องหมายว่า ไม่ได้ใช้เงินเลย' : 'ยังไม่มีรายการในวันนี้'}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {list.map((t) => {
              const c = categoryOf(t.categoryId)
              const Icon = c.icon
              const income = t.type === 'income'
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
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
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
                    aria-label={`แก้ไข ${t.note || c.label}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTransaction(t.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-destructive"
                    aria-label={`ลบ ${t.note || c.label}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => openAdd({ date: dayOpen })}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> เพิ่มรายการ
          </button>
          {list.every((t) => t.type === 'income') && !isToday && (
            <button
              type="button"
              onClick={() => setNoSpendDay(dayOpen, !noSpend)}
              aria-pressed={noSpend}
              className={cn(
                'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold',
                noSpend ? 'bg-info/20 text-info' : 'bg-secondary',
              )}
            >
              <Snowflake className="size-4 text-info" /> {noSpend ? 'ไม่ได้ใช้เงิน ✓' : 'ไม่ได้ใช้เงินเลย'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
