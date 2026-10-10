'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, Check } from 'lucide-react'
import { BUFFER_PERCENT, baht, type Bill, daysInMonth } from '@/lib/budget'
import { computeTax, EMPTY_DEDUCTIONS, type IncomeType } from '@/lib/tax'
import { cn } from '@/lib/utils'
import { BillsEditor } from './bills-editor'
import { DEFAULT_BILLS, type Profile, type Tone, useChaiDai } from './store'

const TOTAL_STEPS = 6

export function Onboarding() {
  const { state, completeOnboarding, today } = useChaiDai()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile>(state.profile)
  const [bills, setBills] = useState<Bill[]>(state.bills.length ? state.bills : DEFAULT_BILLS)

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))
  const patch = (p: Partial<Profile>) => setProfile((prev) => ({ ...prev, ...p }))

  return (
    <div className="flex min-h-full flex-col px-6 pt-14 pb-8 md:min-h-[44rem] md:pt-10">
      {step > 0 && (
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex flex-1 gap-1.5" aria-hidden>
            {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
              <span
                key={i}
                className={cn('h-1.5 flex-1 rounded-full transition-colors', i < step ? 'bg-primary' : 'bg-secondary')}
              />
            ))}
          </div>
        </div>
      )}

      <div key={step} className="flex min-h-0 flex-1 flex-col animate-in fade-in slide-in-from-right-4 duration-300">
        {step === 0 && <Welcome onNext={next} />}
        {step === 1 && <IncomeStep profile={profile} patch={patch} onNext={next} />}
        {step === 2 && <BillsStep bills={bills} setBills={setBills} onNext={next} />}
        {step === 3 && <SavingsStep profile={profile} patch={patch} onNext={next} />}
        {step === 4 && <AhaStep profile={profile} bills={bills} today={today} onNext={next} />}
        {step === 5 && <ToneStep profile={profile} patch={patch} onFinish={() => completeOnboarding(profile, bills)} />}
      </div>
    </div>
  )
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
  <div className="mt-auto w-full pt-8">
  <button
  type="button"
  onClick={onClick}
  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
  >
  {children}
  </button>
  </div>
  )
}

function StepTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-balance text-2xl font-bold leading-snug">{title}</h2>
      {sub && <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-8 size-52 overflow-hidden rounded-[2.5rem] bg-card">
          <Image src="/images/nong-keb.png" alt="น้องเก็บ มาสคอตแมวถือกระปุกออมสิน" fill className="object-cover" priority />
        </div>
        <p className="font-display text-sm font-semibold tracking-widest text-primary">CHAIDAI</p>
        <h1 className="mt-3 text-balance text-3xl font-bold leading-tight">รู้ไหม วันนี้คุณใช้ได้อีกกี่บาท?</h1>
        <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
          ตอบ 4 คำถามสั้นๆ แล้วน้องเก็บจะคำนวณงบที่ใช้ได้จริงของคุณ หลังหักเงินออม ค่าบิล และภาษีไว้ให้แล้ว
        </p>
      </div>
      <PrimaryButton onClick={onNext}>
        มาหาคำตอบกัน <ArrowRight className="size-5" />
      </PrimaryButton>
    </>
  )
}

function IncomeStep({ profile, patch, onNext }: { profile: Profile; patch: (p: Partial<Profile>) => void; onNext: () => void }) {
  const types: { id: IncomeType; label: string; sub: string }[] = [
    { id: 'salary', label: 'มนุษย์เงินเดือน', sub: 'เงินได้ 40(1) หัก ณ ที่จ่ายโดยนายจ้าง' },
    { id: 'freelance', label: 'ฟรีแลนซ์', sub: 'เงินได้ 40(2) ต้องกันภาษีเอง' },
  ]
  return (
    <>
      <StepTitle eyebrow="1 / 4  รายได้" title="เดือนหนึ่งได้เงินประมาณเท่าไหร่?" />
      <label className="block rounded-3xl bg-card p-5">
        <span className="text-xs text-muted-foreground">รายได้ต่อเดือน (บาท)</span>
        <input
          inputMode="numeric"
          value={profile.income ? baht(profile.income) : ''}
          onChange={(e) => patch({ income: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          className="mt-1 w-full bg-transparent font-display text-4xl font-bold tabular-nums outline-none"
          aria-label="รายได้ต่อเดือน"
        />
        <input
          type="range"
          min={10000}
          max={150000}
          step={1000}
          value={profile.income}
          onChange={(e) => patch({ income: Number(e.target.value) })}
          className="mt-4 w-full"
          aria-label="ปรับรายได้"
        />
      </label>

      <label className="mt-4 block rounded-3xl bg-card p-5">
        <span className="text-xs text-muted-foreground">อาชีพของคุณ (พิมพ์เองได้)</span>
        <input
          value={profile.occupation}
          onChange={(e) => patch({ occupation: e.target.value.slice(0, 40) })}
          className="mt-1 w-full bg-transparent text-lg font-semibold outline-none"
          placeholder="เช่น นักศึกษา, กราฟิกดีไซเนอร์"
          aria-label="อาชีพ"
        />
      </label>

      <fieldset className="mt-6 flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">ประเภทรายได้</legend>
        {types.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => patch({ incomeType: t.id })}
            aria-pressed={profile.incomeType === t.id}
            className={cn(
              'flex items-center justify-between rounded-2xl border p-4 text-left transition-colors',
              profile.incomeType === t.id ? 'border-primary bg-primary/10' : 'border-border bg-card',
            )}
          >
            <span>
              <span className="block font-semibold">{t.label}</span>
              <span className="block text-xs text-muted-foreground">{t.sub}</span>
            </span>
            {profile.incomeType === t.id && <Check className="size-5 text-primary" />}
          </button>
        ))}
      </fieldset>
      <PrimaryButton onClick={onNext}>ต่อไป</PrimaryButton>
    </>
  )
}

function BillsStep({ bills, setBills, onNext }: { bills: Bill[]; setBills: (b: Bill[]) => void; onNext: () => void }) {
  return (
    <>
      <StepTitle eyebrow="2 / 4  ค่าใช้จ่ายคงที่" title="มีบิลอะไรที่ต้องจ่ายทุกเดือนบ้าง?" sub="แตะเพื่อเลือก แก้ยอดได้เลย หรือพิมพ์เพิ่มรายการของคุณเอง" />
      <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        <BillsEditor bills={bills} onChange={setBills} />
      </div>
      <PrimaryButton onClick={onNext}>ต่อไป</PrimaryButton>
    </>
  )
}

function SavingsStep({ profile, patch, onNext }: { profile: Profile; patch: (p: Partial<Profile>) => void; onNext: () => void }) {
  const presets = [0.1, 0.2, 0.3]
  return (
    <>
      <StepTitle eyebrow="3 / 4  เป้าหมายการออม" title="อยากเก็บเดือนละเท่าไหร่?" sub="น้องเก็บจะหักเงินก้อนนี้ไว้ก่อน คุณจะไม่เผลอใช้" />
      <div className="mb-4 grid grid-cols-3 gap-2">
        {presets.map((p) => {
          const value = Math.round((profile.income * p) / 100) * 100
          const active = profile.savingsTarget === value
          return (
            <button
              key={p}
              type="button"
              onClick={() => patch({ savingsTarget: value })}
              aria-pressed={active}
              className={cn(
                'rounded-2xl border p-3 text-center transition-colors',
                active ? 'border-primary bg-primary/10' : 'border-border bg-card',
              )}
            >
              <span className="block font-display text-xl font-bold">{p * 100}%</span>
              <span className="block text-xs text-muted-foreground tabular-nums">฿{baht(value)}</span>
            </button>
          )
        })}
      </div>
      <label className="block rounded-3xl bg-card p-5">
        <span className="text-xs text-muted-foreground">หรือกำหนดเอง (บาท/เดือน)</span>
        <input
          inputMode="numeric"
          value={baht(profile.savingsTarget)}
          onChange={(e) => patch({ savingsTarget: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          className="mt-1 w-full bg-transparent font-display text-3xl font-bold tabular-nums outline-none"
        />
      </label>
      <label className="mt-4 block rounded-3xl bg-card p-5">
        <span className="text-xs text-muted-foreground">ตั้งชื่อเป้าหมาย</span>
        <input
          value={profile.goalName}
          onChange={(e) => patch({ goalName: e.target.value })}
          className="mt-1 w-full bg-transparent text-lg font-semibold outline-none"
          placeholder="เช่น เงินฉุกเฉิน"
        />
      </label>
      <PrimaryButton onClick={onNext}>คำนวณงบของฉัน</PrimaryButton>
    </>
  )
}

function AhaStep({ profile, bills, today, onNext }: { profile: Profile; bills: Bill[]; today: Date; onNext: () => void }) {
  const calc = useMemo(() => {
    const tax = computeTax(profile.income * 12, profile.incomeType, EMPTY_DEDUCTIONS)
    const taxReserve = Math.max(0, Math.round(tax.balance / 12))
    const billsTotal = bills.reduce((s, b) => s + b.amount, 0)
    const buffer = Math.round((profile.income * BUFFER_PERCENT) / 100)
    const pool = profile.income - billsTotal - profile.savingsTarget - taxReserve - buffer
    return { taxReserve, billsTotal, buffer, pool, perDay: Math.floor(pool / daysInMonth(today)) }
  }, [profile, bills, today])

  const parts = [
    { label: 'ค่าบิลประจำ', value: calc.billsTotal, color: 'bg-info' },
    { label: `ออม: ${profile.goalName || 'เป้าหมาย'}`, value: profile.savingsTarget, color: 'bg-chart-5' },
    { label: 'กันไว้จ่ายภาษี', value: calc.taxReserve, color: 'bg-warning' },
    { label: 'เงินสำรองฉุกเฉิน 5%', value: calc.buffer, color: 'bg-muted-foreground' },
  ]
  const usable = Math.max(0, calc.pool)
  const spentTotal = parts.reduce((s, r) => s + r.value, 0)
  const over = Math.max(0, spentTotal - profile.income)
  // every bar is measured against the same total so they always add up to 100%
  const denom = Math.max(1, profile.income, spentTotal)
  const pctOf = (v: number) => (v / denom) * 100
  const rows = [
    { label: 'รายได้', value: profile.income, color: 'bg-foreground', sign: '' },
    ...parts.map((r) => ({ ...r, sign: '−' })),
    { label: 'ใช้ได้จริง', value: usable, color: 'bg-primary', sign: '' },
  ]

  return (
    <>
      <StepTitle eyebrow="4 / 4  ผลลัพธ์" title="นี่คือเงินที่ใช้ได้จริงของคุณ" />

      <div
        className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={`สัดส่วนรายได้: ใช้ได้จริง ${Math.round(pctOf(usable))}%`}
      >
        {[...parts, { label: 'ใช้ได้จริง', value: usable, color: 'bg-primary' }]
          .filter((r) => r.value > 0)
          .map((r) => (
            <span key={r.label} className={cn('h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full', r.color)} style={{ width: `${pctOf(r.value)}%` }} />
          ))}
      </div>
      {over > 0 && <p className="mt-2 text-xs text-warning">ค่าบิล เงินออม และภาษีรวมกันเกินรายได้ ฿{baht(over)} ลองลดเป้าออมหรือค่าบิล</p>}

      <ol className="mt-6 flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.label} className="animate-in fade-in slide-in-from-left-4 fill-mode-both duration-500" style={{ animationDelay: `${i * 160}ms` }}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-display font-semibold tabular-nums">
                {r.value > 0 ? r.sign : ''}฿{baht(r.value)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">{Math.round(pctOf(r.value))}%</span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full rounded-full', r.color)} style={{ width: `${r.value > 0 ? Math.max(pctOf(r.value), 1.5) : 0}%` }} />
            </div>
          </li>
        ))}
      </ol>

      <div
        className="mt-8 rounded-3xl bg-primary p-6 text-primary-foreground animate-in zoom-in-95 fade-in fill-mode-both duration-500"
        style={{ animationDelay: '1000ms' }}
      >
        <p className="text-sm font-medium opacity-80">เดือนนี้ใช้ได้</p>
        <p className="font-display text-4xl font-bold tabular-nums">฿{baht(usable)}</p>
        <p className="mt-2 text-sm font-medium">
          {'= วันละ '}
          <span className="font-display text-xl font-bold tabular-nums">฿{baht(Math.max(0, calc.perDay))}</span>
          {' โดยไม่กระทบเงินออม'}
        </p>
      </div>
      <PrimaryButton onClick={onNext}>เยี่ยมเลย ไปต่อ</PrimaryButton>
    </>
  )
}

function ToneStep({ profile, patch, onFinish }: { profile: Profile; patch: (p: Partial<Profile>) => void; onFinish: () => void }) {
  const tones: { id: Tone; label: string; sample: string }[] = [
    { id: 'polite', label: 'สุภาพ', sample: 'ถึงเวลาบันทึกแล้วนะ ใช้แค่ 10 วินาที' },
    { id: 'cheeky', label: 'กวนนิดๆ', sample: 'ทุ่มตรงแล้ว! ไฟ Streak รออยู่นะ' },
    { id: 'savage', label: 'โหดจริง', sample: 'อย่ามาทำเป็นลืม บันทึกเดี๋ยวนี้!' },
  ]
  return (
    <>
      <StepTitle eyebrow="อีกนิดเดียว" title="อยากให้น้องเก็บเตือนแบบไหน?" />
      <div className="flex flex-col gap-3">
        {tones.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => patch({ tone: t.id })}
            aria-pressed={profile.tone === t.id}
            className={cn(
              'rounded-2xl border p-4 text-left transition-colors',
              profile.tone === t.id ? 'border-primary bg-primary/10' : 'border-border bg-card',
            )}
          >
            <span className="block font-semibold">{t.label}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{`“${t.sample}”`}</span>
          </button>
        ))}
      </div>
      <label className="mt-6 flex items-center justify-between rounded-2xl bg-card p-4">
        <span className="flex items-center gap-3">
          <Bell className="size-5 text-primary" />
          <span className="font-medium">เวลาเตือนทุกวัน</span>
        </span>
        <input
          type="time"
          value={profile.reminderTime}
          onChange={(e) => patch({ reminderTime: e.target.value })}
          className="rounded-lg bg-secondary px-3 py-1.5 font-display font-semibold outline-none"
        />
      </label>
      <PrimaryButton onClick={onFinish}>เปิดแจ้งเตือนและเริ่มใช้งาน</PrimaryButton>
    </>
  )
}
