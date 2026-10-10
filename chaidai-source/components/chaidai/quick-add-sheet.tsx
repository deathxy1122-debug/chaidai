'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Delete, ImagePlus, LoaderCircle, Plus, ScanLine, TriangleAlert, X } from 'lucide-react'
import { baht, dateKey, parseKey } from '@/lib/budget'
import { blobToDataUrl, readSlip, resizeToJpeg } from '@/lib/slip'
import { cn } from '@/lib/utils'
import { CUSTOM_COLORS, CUSTOM_ICONS, INCOME_CATEGORY } from './catalog'
import { MoneyInput } from './fields'
import { useChaiDai } from './store'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del']

export function QuickAddSheet() {
  const { addSheet } = useChaiDai()
  if (!addSheet) return null
  return <AddBody key={`${addSheet.date}-${addSheet.editId ?? 'new'}`} date={addSheet.date} editId={addSheet.editId} />
}

type SlipItem = {
  id: string
  thumb: string
  amount: number
  note: string
  recipient: string | null
  status: 'reading' | 'done' | 'none' | 'failed' | 'unavailable'
}

function AddBody({ date, editId }: { date: string; editId?: string }) {
  const { closeAdd, addTransactions, updateTransaction, budget, state, categories, addCategory, todayKey } = useChaiDai()
  const editing = editId ? state.transactions.find((t) => t.id === editId) : undefined

  const suggestedFirst = (() => {
    const h = new Date().getHours()
    return h < 10 ? 'coffee' : h < 14 ? 'food' : h < 17 ? 'coffee' : h < 21 ? 'food' : 'fun'
  })()
  const ordered = [...categories].sort((a, b) => (a.id === suggestedFirst ? -1 : b.id === suggestedFirst ? 1 : 0))

  const [type, setType] = useState<'expense' | 'income'>(editing?.type ?? 'expense')
  const [mode, setMode] = useState<'manual' | 'slip'>('manual')
  const [value, setValue] = useState(editing ? String(editing.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(editing && editing.type !== 'income' ? editing.categoryId : null)
  const [note, setNote] = useState(editing?.note ?? '')
  const [slips, setSlips] = useState<SlipItem[]>([])
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(CUSTOM_COLORS[0])
  const [newIcon, setNewIcon] = useState('tag')
  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const queueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => () => abortRef.current?.abort(), [])

  const selected = categoryId ?? ordered[0].id
  const amount = Number(value) || 0
  const isToday = date === todayKey
  const after = budget.safeToday - amount
  const slipTotal = slips.reduce((s, x) => s + (x.amount > 0 ? x.amount : 0), 0)
  const slipReady = slips.filter((x) => x.amount > 0).length
  const reading = slips.some((x) => x.status === 'reading')

  const dateLabel = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', weekday: 'short' }).format(parseKey(date))

  const press = (k: string) => {
    if (k === 'del') return setValue((v) => v.slice(0, -1))
    setValue((v) => (v.length >= 7 ? v : (v + k).replace(/^0+/, '')))
  }

  const patchSlip = (id: string, patch: Partial<SlipItem>) => setSlips((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 12)
    if (fileRef.current) fileRef.current.value = ''
    if (!abortRef.current) abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    for (const file of list) {
      const id = `slip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      try {
        const [thumbBlob, readBlob] = await Promise.all([resizeToJpeg(file, 480, 0.6), resizeToJpeg(file, 1280, 0.85)])
        const thumb = await blobToDataUrl(thumbBlob)
        setSlips((p) => [...p, { id, thumb, amount: 0, note: '', recipient: null, status: 'reading' }])
        queueRef.current = queueRef.current.then(async () => {
          if (signal.aborted) return
          try {
            const r = await readSlip(readBlob, signal)
            if (r === 'unavailable') return patchSlip(id, { status: 'unavailable' })
            if (r.amount) patchSlip(id, { amount: r.amount, recipient: r.recipient, status: 'done' })
            else patchSlip(id, { recipient: r.recipient, status: 'none' })
          } catch {
            if (!signal.aborted) patchSlip(id, { status: 'failed' })
          }
        })
      } catch {
        /* unreadable image: skip */
      }
    }
  }

  const createCategory = () => {
    if (!newName.trim()) return
    const id = addCategory(newName, newColor, newIcon)
    setCategoryId(id)
    setNewName('')
    setNewCatOpen(false)
  }

  const saveManual = () => {
    if (amount <= 0) return
    const cat = type === 'income' ? INCOME_CATEGORY.id : selected
    if (editing) {
      updateTransaction(editing.id, { amount, categoryId: cat, note: note.trim(), type })
    } else {
      addTransactions([{ amount, categoryId: cat, note: note.trim(), date, type }])
    }
    closeAdd()
  }

  const saveSlips = () => {
    const cat = type === 'income' ? INCOME_CATEGORY.id : selected
    addTransactions(
      slips
        .filter((s) => s.amount > 0)
        .map((s) => ({ amount: s.amount, categoryId: cat, note: s.note.trim() || s.recipient || 'สลิปโอนเงิน', date, type, slip: s.thumb })),
    )
    closeAdd()
  }

  const title = editing ? 'แก้ไขรายการ' : type === 'income' ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย'
  const hasAmountCopy = amount
    ? type === 'income'
      ? `รับเงินเพิ่ม ฿${baht(amount)}`
      : !isToday
        ? `บันทึกย้อนหลังวันที่ ${dateLabel}`
        : after < 0
          ? `เกินงบวันนี้ ฿${baht(-after)} — พรุ่งนี้งบจะลดลง`
          : `หลังบันทึก เหลือใช้ได้ ฿${baht(after)}`
    : isToday
      ? `วันนี้ใช้ได้อีก ฿${baht(budget.safeToday)}`
      : `วันที่ ${dateLabel}`

  return (
    <div className="absolute inset-0 z-[55] flex flex-col justify-end md:items-center md:justify-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-in fade-in" onClick={closeAdd} aria-label="ปิด" />
      <div className="no-scrollbar relative max-h-full w-full overflow-y-auto rounded-t-[2rem] border-t border-border bg-card px-5 pt-4 pb-8 animate-in slide-in-from-bottom duration-300 md:max-w-md md:rounded-[2rem] md:border md:pb-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">
            {title}
            {date !== dateKey(new Date()) && !editing && <span className="ml-2 text-xs font-normal text-muted-foreground">· {dateLabel}</span>}
          </span>
          <button type="button" onClick={closeAdd} className="rounded-full bg-secondary p-2" aria-label="ปิด">
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-3 flex rounded-xl bg-secondary p-1" role="tablist" aria-label="ประเภทรายการ">
          {(
            [
              ['expense', 'รายจ่าย'],
              ['income', 'รายรับ'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={type === id}
              onClick={() => setType(id)}
              className={cn('flex-1 rounded-lg py-1.5 text-xs font-semibold', type === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
            >
              {label}
            </button>
          ))}
        </div>

        {!editing && (
          <div className="mb-3 flex rounded-xl bg-secondary p-1" role="tablist" aria-label="วิธีบันทึก">
            {(
              [
                ['manual', 'คีย์ยอดเอง'],
                ['slip', 'แนบสลิป'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold',
                  mode === id ? 'bg-card text-foreground shadow' : 'text-muted-foreground',
                )}
              >
                {id === 'slip' && <ScanLine className="size-3.5" />}
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === 'manual' ? (
          <div className="text-center">
            <p className={cn('font-display text-5xl font-bold tabular-nums', amount ? (type === 'income' ? 'text-primary' : 'text-foreground') : 'text-muted-foreground')}>
              ฿{amount ? baht(amount) : '0'}
            </p>
            <p className={cn('mt-1 text-xs tabular-nums', type === 'expense' && isToday && amount && after < 0 ? 'text-destructive' : 'text-muted-foreground')}>{hasAmountCopy}</p>
          </div>
        ) : (
          <div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} aria-label="เลือกรูปสลิป" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-secondary/50 text-sm font-medium"
            >
              <ImagePlus className="size-5 text-primary" />
              เลือกรูปสลิป (เลือกหลายรูปพร้อมกันได้)
            </button>

            {slips.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2.5">
                {slips.map((s) => (
                  <li key={s.id} className="flex gap-3 rounded-2xl bg-secondary p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.thumb} alt="สลิป" className="h-24 w-[4.5rem] shrink-0 rounded-lg object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {s.status === 'reading' && (
                            <>
                              <LoaderCircle className="size-3.5 animate-spin" /> กำลังอ่านยอด…
                            </>
                          )}
                          {s.status === 'done' && (
                            <>
                              <Check className="size-3.5 text-primary" /> อ่านยอดอัตโนมัติ{s.recipient ? ` · ${s.recipient}` : ''}
                            </>
                          )}
                          {s.status === 'none' && (
                            <>
                              <TriangleAlert className="size-3.5 text-warning" /> อ่านยอดไม่ได้ กรุณากรอกเอง
                            </>
                          )}
                          {s.status === 'failed' && (
                            <>
                              <TriangleAlert className="size-3.5 text-warning" /> อ่านยอดไม่สำเร็จ กรุณากรอกเอง
                            </>
                          )}
                          {s.status === 'unavailable' && (
                            <>
                              <TriangleAlert className="size-3.5 text-warning" /> ยังอ่านยอดอัตโนมัติไม่ได้ในหน้านี้ กรุณากรอกเอง
                            </>
                          )}
                        </span>
                        <button type="button" onClick={() => setSlips((p) => p.filter((x) => x.id !== s.id))} className="rounded-full p-1 text-muted-foreground" aria-label="เอาสลิปออก">
                          <X className="size-4" />
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        ยอด ฿
                        <MoneyInput value={s.amount} onChange={(n) => patchSlip(s.id, { amount: n })} label="ยอดเงินในสลิป" className="w-full bg-card" />
                      </label>
                      <input
                        value={s.note}
                        onChange={(e) => patchSlip(s.id, { note: e.target.value })}
                        placeholder={s.recipient ? `โน้ต เช่น ${s.recipient}` : 'โน้ตของสลิปนี้ (ไม่บังคับ)'}
                        aria-label="โน้ตสลิป"
                        className="h-9 w-full rounded-lg bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {slips.length === 0 ? 'ระบบจะอ่านยอดเงินจากสลิปให้ แก้ตัวเลขได้ก่อนบันทึก' : `พร้อมบันทึก ${slipReady} จาก ${slips.length} ใบ · รวม ฿${baht(slipTotal)}`}
            </p>
          </div>
        )}

        {type === 'expense' && (
          <>
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5" role="radiogroup" aria-label="หมวดหมู่">
              {ordered.map((c) => {
                const Icon = c.icon
                const active = selected === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary',
                    )}
                  >
                    <Icon className="size-4" />
                    {c.label}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setNewCatOpen((o) => !o)}
                aria-expanded={newCatOpen}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-primary/60 px-3 py-2 text-sm text-primary"
              >
                <Plus className="size-4" /> หมวดใหม่
              </button>
            </div>

            {newCatOpen && (
              <div className="mt-3 rounded-2xl bg-secondary p-3 animate-in fade-in">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) createCategory()
                  }}
                  maxLength={20}
                  placeholder="ชื่อหมวดหมู่ เช่น ค่าเทอม, สัตว์เลี้ยง"
                  aria-label="ชื่อหมวดหมู่ใหม่"
                  className="h-10 w-full rounded-lg bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {Object.entries(CUSTOM_ICONS).map(([key, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNewIcon(key)}
                      aria-pressed={newIcon === key}
                      aria-label={`ไอคอน ${key}`}
                      className={cn('flex size-8 items-center justify-center rounded-lg', newIcon === key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}
                    >
                      <Icon className="size-4" />
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-2">
                    {CUSTOM_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        aria-pressed={newColor === c}
                        aria-label="เลือกสี"
                        className={cn('size-6 rounded-full border-2', newColor === c ? 'border-foreground' : 'border-transparent')}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={createCategory}
                    disabled={!newName.trim()}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    เพิ่มหมวด
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'manual' && (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) saveManual()
              }}
              placeholder={type === 'income' ? 'โน้ต (ไม่บังคับ) เช่น งานพิเศษ' : 'โน้ต (ไม่บังคับ) เช่น ข้าวมันไก่'}
              className="mt-3 h-11 w-full rounded-xl bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              aria-label="โน้ต"
            />

            <div className="mt-3 grid grid-cols-3 gap-2">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => press(k)}
                  className="flex h-12 items-center justify-center rounded-xl bg-secondary font-display text-xl font-semibold active:bg-accent"
                  aria-label={k === 'del' ? 'ลบ' : k}
                >
                  {k === 'del' ? <Delete className="size-5" /> : k}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={saveManual}
              disabled={amount <= 0}
              className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
            >
              <Check className="size-5" /> {editing ? 'บันทึกการแก้ไข' : isToday ? 'บันทึก (+10 XP)' : 'บันทึกย้อนหลัง'}
            </button>
          </>
        )}

        {mode === 'slip' && (
          <button
            type="button"
            onClick={saveSlips}
            disabled={slipReady === 0 || reading}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <Check className="size-5" /> {reading ? 'กำลังอ่านสลิป…' : slipReady > 0 ? `บันทึก ${slipReady} รายการ · ฿${baht(slipTotal)}` : 'ใส่ยอดอย่างน้อย 1 ใบ'}
          </button>
        )}
      </div>
    </div>
  )
}
