'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { baht, type Bill } from '@/lib/budget'
import { cn } from '@/lib/utils'
import { BILL_PRESETS, billIcon } from './catalog'
import { MoneyInput } from './fields'

export function BillsEditor({ bills, onChange, className }: { bills: Bill[]; onChange: (b: Bill[]) => void; className?: string }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState(0)

  const toggle = (id: string) => {
    const preset = BILL_PRESETS.find((b) => b.id === id)
    if (!preset) return
    onChange(bills.some((b) => b.id === id) ? bills.filter((b) => b.id !== id) : [...bills, { id, name: preset.name, icon: id, amount: preset.amount }])
  }
  const setAmountFor = (id: string, value: number) => onChange(bills.map((b) => (b.id === id ? { ...b, amount: value } : b)))
  const customs = bills.filter((b) => !BILL_PRESETS.some((p) => p.id === b.id))

  const addCustom = () => {
    const n = name.trim()
    if (!n) return
    onChange([...bills, { id: `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: n.slice(0, 30), icon: 'custom', amount }])
    setName('')
    setAmount(0)
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {BILL_PRESETS.map((p) => {
        const selected = bills.find((b) => b.id === p.id)
        const Icon = p.icon
        return (
          <div key={p.id} className={cn('flex items-center gap-3 rounded-2xl border p-3 transition-colors', selected ? 'border-primary/60 bg-primary/5' : 'border-border bg-card')}>
            <button type="button" onClick={() => toggle(p.id)} aria-pressed={Boolean(selected)} className="flex flex-1 items-center gap-3 text-left">
              <span className={cn('flex size-10 items-center justify-center rounded-xl', selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                <Icon className="size-5" />
              </span>
              <span className="font-medium">{p.name}</span>
            </button>
            {selected && <MoneyInput value={selected.amount} onChange={(n) => setAmountFor(p.id, n)} label={`ยอด${p.name}`} className="w-24" />}
          </div>
        )
      })}

      {customs.map((b) => {
        const Icon = billIcon(b.icon)
        return (
          <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-primary/60 bg-primary/5 p-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Icon className="size-5" />
            </span>
            <input
              value={b.name}
              onChange={(e) => onChange(bills.map((x) => (x.id === b.id ? { ...x, name: e.target.value.slice(0, 30) } : x)))}
              aria-label="ชื่อค่าใช้จ่าย"
              className="min-w-0 flex-1 bg-transparent font-medium outline-none"
            />
            <MoneyInput value={b.amount} onChange={(n) => setAmountFor(b.id, n)} label={`ยอด${b.name}`} className="w-24" />
            <button type="button" onClick={() => onChange(bills.filter((x) => x.id !== b.id))} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive" aria-label={`ลบ ${b.name}`}>
              <Trash2 className="size-4" />
            </button>
          </div>
        )
      })}

      <div className="rounded-2xl border border-dashed border-border bg-card p-3">
        <p className="mb-2 text-xs text-muted-foreground">เพิ่มค่าใช้จ่ายประจำของคุณเอง</p>
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) addCustom()
            }}
            maxLength={30}
            placeholder="เช่น ค่าผ่อนรถ, ค่าเทอม"
            aria-label="ชื่อค่าใช้จ่ายประจำใหม่"
            className="h-10 min-w-0 flex-1 rounded-lg bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <MoneyInput value={amount} onChange={setAmount} label="ยอดค่าใช้จ่ายประจำใหม่" className="h-10 w-24" />
          <button type="button" onClick={addCustom} disabled={!name.trim()} className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40" aria-label="เพิ่มค่าใช้จ่าย">
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      <p className="flex justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">รวมต่อเดือน</span>
        <span className="font-display font-semibold tabular-nums">฿{baht(bills.reduce((s, b) => s + b.amount, 0))}</span>
      </p>
    </div>
  )
}
