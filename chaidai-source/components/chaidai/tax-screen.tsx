'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Download, FileText, Lightbulb, Minus, Plus, Printer, RotateCcw, Sparkles } from 'lucide-react'
import { baht } from '@/lib/budget'
import {
  buildSuggestions,
  computeTax,
  DEDUCTION_META,
  type DeductionKey,
  type Deductions,
  EMPTY_DEDUCTIONS,
  remainingCap,
  TAX_BRACKETS,
} from '@/lib/tax'
import { buildTaxReturn, type TaxReturn, taxReturnHtml, taxReturnText } from '@/lib/tax-return'
import { cn } from '@/lib/utils'
import { MoneyInput, PAGE } from './fields'
import { useChaiDai } from './store'

const KEYS: DeductionKey[] = ['rmf', 'thaiEsg', 'lifeIns', 'healthIns']

export function TaxScreen() {
  const { state, tax, annualIncome, applyDeductions, today } = useChaiDai()
  const [sim, setSim] = useState<Deductions>(EMPTY_DEDUCTIONS)
  const { incomeType } = state.profile
  const a = state.allowances

  const combined = useMemo(() => {
    const d = { ...state.deductions }
    KEYS.forEach((k) => (d[k] += sim[k]))
    return d
  }, [state.deductions, sim])

  const simTax = useMemo(() => computeTax(annualIncome, incomeType, combined, a), [annualIncome, incomeType, combined, a])
  const suggestions = useMemo(() => buildSuggestions(annualIncome, incomeType, state.deductions, a), [annualIncome, incomeType, state.deductions, a])

  const simTotal = KEYS.reduce((s, k) => s + sim[k], 0)
  const saved = tax.tax - simTax.tax
  const shown = simTotal > 0 ? simTax : tax

  const commit = () => {
    applyDeductions(sim)
    setSim(EMPTY_DEDUCTIONS)
  }

  return (
    <div className={PAGE}>
      <header className="mb-4">
        <p className="text-xs text-muted-foreground">ปีภาษี {today.getFullYear() + 543}</p>
        <h1 className="text-2xl font-bold">โค้ชภาษีส่วนตัว</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="health" className="rounded-[2rem] bg-card p-5">
            <h2 id="health" className="text-sm text-muted-foreground">
              Tax Health Bar
            </h2>
            <div className="mt-3 flex gap-1" role="img" aria-label={`อยู่ฐานภาษี ${Math.round(shown.marginalRate * 100)}%`}>
              {TAX_BRACKETS.slice(0, 6).map((b, i) => (
                <div key={b.rate} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className={cn('h-3 w-full rounded-full transition-colors duration-500', i < shown.bracketIndex ? 'bg-warning/40' : i === shown.bracketIndex ? 'bg-warning' : 'bg-secondary')} />
                  <span className={cn('font-display text-[11px]', i === shown.bracketIndex ? 'font-bold text-warning' : 'text-muted-foreground')}>{b.rate * 100}%</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              เงินได้สุทธิ ฿{baht(shown.net)}
              {shown.toNextBracket !== null && ` · อีก ฿${baht(shown.toNextBracket)} จะขึ้นฐาน ${TAX_BRACKETS[shown.bracketIndex + 1].rate * 100}%`}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <dt className="text-xs text-muted-foreground">ภาษีทั้งปีโดยประมาณ</dt>
                <dd className="font-display text-xl font-bold tabular-nums">฿{baht(shown.tax)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{incomeType === 'salary' ? 'หัก ณ ที่จ่ายแล้ว' : 'ต้องกันไว้เอง'}</dt>
                <dd className="font-display text-xl font-bold tabular-nums">฿{baht(incomeType === 'salary' ? shown.withheld : shown.tax)}</dd>
              </div>
            </dl>
            <div className={cn('mt-4 rounded-2xl p-4', shown.balance > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
              <p className="text-xs font-medium">{shown.balance > 0 ? 'ต้องจ่ายเพิ่มตอนยื่นภาษี' : shown.balance < 0 ? 'คาดว่าจะได้เงินคืน' : 'ไม่ต้องจ่ายเพิ่ม'}</p>
              <p className="font-display text-3xl font-bold tabular-nums">฿{baht(Math.abs(shown.balance))}</p>
            </div>
          </section>

          {suggestions.length > 0 && (
            <section aria-labelledby="coach">
              <h2 id="coach" className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="size-4 text-warning" /> คำแนะนำจากน้องเก็บ
              </h2>
              <ul className="flex flex-col gap-2">
                {suggestions.map((s) => (
                  <li key={s.key} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <p className="flex-1 text-pretty text-sm leading-relaxed">
                      {`ถ้าซื้อ${DEDUCTION_META[s.key].label}อีก `}
                      <span className="font-display font-bold">฿{baht(s.amount)}</span>
                      {' จะประหยัดภาษีได้ '}
                      <span className="font-display font-bold text-primary">฿{baht(s.saved)}</span>
                      {s.dropsBracket && <span className="text-warning">{' และหลุดลงฐานต่ำกว่า'}</span>}
                    </p>
                    <button type="button" onClick={() => setSim((p) => ({ ...p, [s.key]: s.amount }))} className="shrink-0 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold">
                      ลองคำนวณ
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="sim" className="rounded-[2rem] bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 id="sim" className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-primary" /> Tax Simulator
              </h2>
              {simTotal > 0 && (
                <button type="button" onClick={() => setSim(EMPTY_DEDUCTIONS)} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RotateCcw className="size-3.5" /> ล้าง
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-5">
              {KEYS.map((k) => {
                const max = remainingCap(k, annualIncome, { ...combined, [k]: state.deductions[k] }, a)
                return (
                  <label key={k} className="block">
                    <span className="flex justify-between text-sm">
                      <span className="font-medium">{DEDUCTION_META[k].label}</span>
                      <span className="font-display font-semibold tabular-nums">฿{baht(sim[k])}</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(max, 1000)}
                      step={1000}
                      value={Math.min(sim[k], max)}
                      disabled={max <= 0}
                      onChange={(e) => setSim((p) => ({ ...p, [k]: Number(e.target.value) }))}
                      className="mt-2 w-full disabled:opacity-40"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      {state.deductions[k] > 0 && `ใช้แล้ว ฿${baht(state.deductions[k])} · `}
                      {DEDUCTION_META[k].hint}
                    </span>
                  </label>
                )
              })}
            </div>

            {simTotal > 0 && (
              <div className="mt-5 rounded-2xl bg-secondary p-4 animate-in fade-in">
                <p className="text-sm">
                  {'ลงทุน/ซื้อประกันรวม '}
                  <span className="font-display font-bold">฿{baht(simTotal)}</span>
                  {' ประหยัดภาษี '}
                  <span className="font-display font-bold text-primary">฿{baht(saved)}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {`เหมือนได้ส่วนลด ${simTotal ? Math.round((saved / simTotal) * 100) : 0}% · ถ้าทยอยซื้อรายเดือน งบรายวันจะลดลงประมาณ ฿${baht(simTotal / 12 / 30)}/วัน`}
                </p>
                <button type="button" onClick={commit} className="mt-3 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  บันทึกว่าซื้อแล้ว (+50 XP)
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <AllowancesCard />
          <DetailCard />
        </div>
      </div>

      <div className="mt-4">
        <ReturnCard taxYear={today.getFullYear() + 543} />
      </div>

      <p className="mt-4 text-pretty text-[11px] leading-relaxed text-muted-foreground">
        ตัวเลขเป็นการประมาณการเพื่อวางแผน คำนวณจากค่าใช้จ่าย 50% (ไม่เกิน 100,000) ลดหย่อนส่วนตัว 60,000 ประกันสังคม และลดหย่อนที่คุณกรอก ไม่ใช่คำแนะนำการลงทุนหรือคำปรึกษาด้านภาษี
      </p>
    </div>
  )
}

function Stepper({ value, onChange, max, label }: { value: number; onChange: (n: number) => void; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} className="flex size-8 items-center justify-center rounded-lg bg-secondary disabled:opacity-40" aria-label={`ลด${label}`}>
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-display font-semibold tabular-nums" aria-label={label}>
        {value}
      </span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="flex size-8 items-center justify-center rounded-lg bg-secondary disabled:opacity-40" aria-label={`เพิ่ม${label}`}>
        <Plus className="size-4" />
      </button>
    </div>
  )
}

function AllowancesCard() {
  const { state, setAllowances } = useChaiDai()
  const a = state.allowances
  return (
    <section aria-labelledby="allow" className="rounded-[2rem] bg-card p-5">
      <h2 id="allow" className="text-sm font-semibold">
        ข้อมูลลดหย่อนของคุณ
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">กรอกเพื่อให้การคำนวณและใบสรุปภาษีแม่นยำขึ้น</p>
      <div className="mt-4 flex flex-col gap-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span>
            คู่สมรสไม่มีเงินได้ <span className="block text-[11px] text-muted-foreground">ลดหย่อน 60,000</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={a.spouse}
            onClick={() => setAllowances({ spouse: !a.spouse })}
            className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', a.spouse ? 'bg-primary' : 'bg-secondary')}
            aria-label="คู่สมรสไม่มีเงินได้"
          >
            <span className={cn('absolute top-1 size-5 rounded-full bg-background transition-all', a.spouse ? 'left-6' : 'left-1')} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>
            บุตร (คน) <span className="block text-[11px] text-muted-foreground">คนละ 30,000 (คนที่ 2 เป็นต้นไปที่เกิดตั้งแต่ปี 2561 ได้ 60,000 ปรับเองในฟอร์มยื่นจริง)</span>
          </span>
          <Stepper value={a.children} onChange={(n) => setAllowances({ children: n })} max={6} label="จำนวนบุตร" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>
            บิดา/มารดา (คน) <span className="block text-[11px] text-muted-foreground">คนละ 30,000 สูงสุด 4 คน</span>
          </span>
          <Stepper value={a.parents} onChange={(n) => setAllowances({ parents: n })} max={4} label="จำนวนบิดามารดา" />
        </div>
        <label className="flex items-center justify-between gap-3">
          <span>
            กองทุนสำรองเลี้ยงชีพ/กบข./เงินออมต่างๆ <span className="block text-[11px] text-muted-foreground">ต่อปี ไม่เกิน 15% ของรายได้ และรวมกับ RMF ไม่เกิน 500,000</span>
          </span>
          <MoneyInput value={a.pvd} onChange={(n) => setAllowances({ pvd: n })} label="กองทุนสำรองเลี้ยงชีพต่อปี" className="w-28" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>
            ดอกเบี้ยกู้ซื้อบ้าน <span className="block text-[11px] text-muted-foreground">ต่อปี สูงสุด 100,000</span>
          </span>
          <MoneyInput value={a.mortgage} onChange={(n) => setAllowances({ mortgage: n })} label="ดอกเบี้ยเงินกู้บ้านต่อปี" className="w-28" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>
            เงินบริจาค <span className="block text-[11px] text-muted-foreground">ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน</span>
          </span>
          <MoneyInput value={a.donation} onChange={(n) => setAllowances({ donation: n })} label="เงินบริจาคต่อปี" className="w-28" />
        </label>
      </div>
    </section>
  )
}

function Row({ label, value, strong, sub, tone }: { label: string; value: string; strong?: boolean; sub?: boolean; tone?: 'primary' | 'warning' }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1.5 text-sm', sub && 'pl-4 text-xs text-muted-foreground', strong && 'font-semibold')}>
      <span>{label}</span>
      <span className={cn('font-display tabular-nums', tone === 'primary' && 'text-primary', tone === 'warning' && 'text-warning')}>{value}</span>
    </div>
  )
}

function DetailCard() {
  const { state, tax, annualIncome } = useChaiDai()
  const a = state.allowances
  const rows = tax.brackets.filter((b) => b.taxable > 0)
  const savedByDeduction = tax.taxWithoutExtra - tax.progressiveTax
  const effective = annualIncome > 0 ? (tax.tax / annualIncome) * 100 : 0

  return (
    <section aria-labelledby="detail" className="rounded-[2rem] bg-card p-5">
      <h2 id="detail" className="text-sm font-semibold">
        วิเคราะห์ภาษีเชิงลึก
      </h2>

      <h3 className="mt-4 text-xs font-medium text-muted-foreground">จากรายได้ถึงเงินได้สุทธิ</h3>
      <div className="mt-1 divide-y divide-border">
        <Row label="เงินได้ทั้งปี (รายได้ต่อเดือน × 12)" value={`฿${baht(tax.annualIncome)}`} strong />
        <Row label="หัก ค่าใช้จ่าย 50% (ไม่เกิน 100,000)" value={`−฿${baht(tax.expense)}`} />
        {tax.allowanceItems.map((i) => (
          <Row key={i.key} label={`หัก ${i.label}`} value={`−฿${baht(i.amount)}`} sub />
        ))}
        <Row label="เงินได้สุทธิ" value={`฿${baht(tax.net)}`} strong tone="primary" />
      </div>

      <h3 className="mt-5 text-xs font-medium text-muted-foreground">คำนวณตามขั้นบันได</h3>
      {rows.length === 0 ? (
        <p className="mt-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">เงินได้สุทธิอยู่ในช่วงยกเว้นภาษี 0–150,000 บาท</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 font-medium">อัตรา</th>
                <th className="py-1 font-medium">เงินได้ในขั้น</th>
                <th className="py-1 text-right font-medium">ภาษี</th>
              </tr>
            </thead>
            <tbody className="font-display tabular-nums">
              {rows.map((b) => (
                <tr key={b.rate} className="border-t border-border">
                  <td className="py-1.5">{Math.round(b.rate * 100)}%</td>
                  <td className="py-1.5">฿{baht(b.taxable)}</td>
                  <td className="py-1.5 text-right">฿{baht(b.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-2 divide-y divide-border">
        <Row label="ภาษีตามอัตราก้าวหน้า" value={`฿${baht(tax.progressiveTax)}`} />
        {tax.minTax > 0 && <Row label="ภาษีขั้นต่ำ 0.5% ของเงินได้ (เทียบ)" value={`฿${baht(tax.minTax)}`} sub />}
        <Row label="ภาษีที่ต้องเสียทั้งปี" value={`฿${baht(tax.tax)}`} strong tone="warning" />
        <Row label="อัตราภาษีที่แท้จริง (ต่อรายได้)" value={`${effective.toFixed(1)}%`} sub />
      </div>
      {tax.usedMinTax && <p className="mt-2 text-[11px] text-warning">ฟรีแลนซ์ที่มีเงินได้เกิน 120,000 ต้องเสียภาษีไม่ต่ำกว่า 0.5% ของเงินได้ ระบบจึงใช้ยอดขั้นต่ำ</p>}

      <h3 className="mt-5 text-xs font-medium text-muted-foreground">ผลของลดหย่อนที่ใช้ไปแล้ว</h3>
      <div className="mt-1 divide-y divide-border">
        <Row label="ภาษีถ้าไม่ใช้ลดหย่อนเพิ่ม" value={`฿${baht(tax.taxWithoutExtra)}`} />
        <Row label="ประหยัดได้จากลดหย่อนที่กรอกไว้" value={`฿${baht(Math.max(0, savedByDeduction))}`} tone="primary" />
      </div>

      <h3 className="mt-5 text-xs font-medium text-muted-foreground">สิทธิ์ลดหย่อนที่ยังใช้ได้</h3>
      <ul className="mt-2 flex flex-col gap-3">
        {KEYS.map((k) => {
          const used = state.deductions[k]
          const left = remainingCap(k, annualIncome, state.deductions, a)
          const cap = used + left
          const p = cap > 0 ? Math.min(100, (used / cap) * 100) : 0
          return (
            <li key={k}>
              <div className="flex justify-between text-xs">
                <span>{DEDUCTION_META[k].label}</span>
                <span className="font-display tabular-nums text-muted-foreground">
                  ใช้ ฿{baht(used)} / ฿{baht(cap)}
                </span>
              </div>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100} aria-label={`สิทธิ์${DEDUCTION_META[k].label}ที่ใช้แล้ว`}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${p}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">เหลือสิทธิ์ ฿{baht(left)}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Paper({ r, id }: { r: TaxReturn; id?: string }) {
  return (
    <div id={id} className="rounded-2xl bg-white p-6 text-neutral-900">
      <div className="flex items-start justify-between gap-4 border-b-2 border-neutral-900 pb-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-neutral-500">ฉบับร่าง · DRAFT</p>
          <h3 className="text-xl font-bold">
            {r.formName} · สรุปภาษีเงินได้บุคคลธรรมดา
          </h3>
          <p className="text-xs text-neutral-600">{r.formSub}</p>
        </div>
        <div className="shrink-0 text-right text-sm">
          <p className="text-xs text-neutral-500">ปีภาษี</p>
          <p className="font-bold">{r.taxYear}</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-neutral-500">ประเภทเงินได้</dt>
          <dd className="font-medium">{r.incomeLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">อาชีพ</dt>
          <dd className="font-medium">{r.occupation || '—'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-neutral-500">ชื่อ-นามสกุล / เลขประจำตัวผู้เสียภาษี (กรอกเองตอนยื่นจริง)</dt>
          <dd className="mt-1 h-6 border-b border-dashed border-neutral-400" />
        </div>
      </dl>
      <table className="mt-4 w-full text-sm">
        <tbody>
          {r.lines.map((l, i) => (
            <tr key={i} className={cn('border-b border-neutral-200 align-top', l.strong && 'font-bold', l.sub && 'text-neutral-600')}>
              <td className="w-7 py-2 pr-1 text-neutral-400">{l.no}</td>
              <td className={cn('py-2', l.sub && 'pl-4 text-xs')}>
                {l.label}
                {l.note && <span className="block text-xs font-normal text-neutral-500">{l.note}</span>}
              </td>
              <td className="whitespace-nowrap py-2 text-right tabular-nums">{new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-neutral-900 p-4">
        <span className="font-bold">{r.result.label}</span>
        <span className="text-xl font-bold tabular-nums">฿{new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(r.result.amount)}</span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
        ฉบับร่างเพื่อการวางแผนและเปรียบเทียบเท่านั้น ไม่ใช่แบบแสดงรายการภาษีทางการ กรุณาตรวจสอบตัวเลขและยื่นจริงผ่านเว็บไซต์กรมสรรพากร (rd.go.th)
      </p>
    </div>
  )
}

function ReturnCard({ taxYear }: { taxYear: number }) {
  const { state, tax } = useChaiDai()
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const r = useMemo(() => buildTaxReturn(tax, state.profile.incomeType, taxYear, state.profile.occupation), [tax, state.profile.incomeType, taxYear, state.profile.occupation])
  const printRoot = typeof document !== 'undefined' ? document.getElementById('print-root') : null

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 2500)
  }

  const copy = async () => {
    const text = taxReturnText(r)
    try {
      await navigator.clipboard.writeText(text)
      return flash('คัดลอกสรุปแล้ว')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        ta.remove()
        flash(ok ? 'คัดลอกสรุปแล้ว' : 'คัดลอกไม่สำเร็จ ลองเลือกข้อความเอง')
      } catch {
        flash('คัดลอกไม่สำเร็จ ลองเลือกข้อความเอง')
      }
    }
  }

  const download = async () => {
    const html = taxReturnHtml(r)
    const filename = `${r.formName}-สรุปภาษี-${r.taxYear}.html`
    try {
      const dl = await (window as any).claude?.use?.('downloads')
      if (dl) {
        await dl.save({ filename, data: html })
        return flash('ส่งไฟล์ให้บันทึกแล้ว')
      }
    } catch {
      /* fall through */
    }
    try {
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      const el = document.createElement('a')
      el.href = url
      el.download = filename
      el.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      flash('กำลังดาวน์โหลดไฟล์')
    } catch {
      flash('ดาวน์โหลดไม่ได้ ลองใช้ปุ่มคัดลอกแทน')
    }
  }

  const print = () => {
    try {
      window.print()
    } catch {
      flash('พิมพ์ไม่ได้ในหน้านี้ ลองดาวน์โหลดไฟล์แล้วพิมพ์')
    }
  }

  return (
    <section aria-labelledby="ret" className="rounded-[2rem] bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="ret" className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-primary" /> ใบสรุปภาษีสำหรับยื่น ({r.formName})
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">ฉบับร่างจากข้อมูลของคุณ ใช้เปรียบเทียบหรือเตรียมก่อนยื่นจริง</p>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {open ? 'ซ่อนใบสรุป' : 'ดูใบสรุป'}
        </button>
      </div>

      {open && (
        <div className="mt-4 animate-in fade-in">
          <Paper r={r} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={copy} className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-4 text-xs font-semibold">
              <Copy className="size-4" /> คัดลอกสรุป
            </button>
            <button type="button" onClick={download} className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-4 text-xs font-semibold">
              <Download className="size-4" /> ดาวน์โหลด
            </button>
            <button type="button" onClick={print} className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-4 text-xs font-semibold">
              <Printer className="size-4" /> พิมพ์ / บันทึก PDF
            </button>
            {msg && (
              <span className="flex items-center gap-1.5 text-xs text-primary" role="status">
                <Check className="size-4" /> {msg}
              </span>
            )}
          </div>
        </div>
      )}
      {open && printRoot && createPortal(<Paper r={r} />, printRoot)}
    </section>
  )
}
