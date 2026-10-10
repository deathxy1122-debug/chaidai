'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Bell, Flame, Lock, RotateCcw, Snowflake, Trash2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BillsEditor } from './bills-editor'
import { BADGES, CUSTOM_ICONS, levelFromXp } from './catalog'
import { PAGE } from './fields'
import { type Tone, useChaiDai } from './store'

const TONES: { id: Tone; label: string }[] = [
  { id: 'polite', label: 'สุภาพ' },
  { id: 'cheeky', label: 'กวนนิดๆ' },
  { id: 'savage', label: 'โหดจริง' },
]

const OCCUPATIONS = ['นักศึกษา', 'พนักงานบริษัท', 'ฟรีแลนซ์', 'ธุรกิจส่วนตัว']

export function MeScreen() {
  const { state, updateProfile, updateBills, sendNudge, showPush, restart, resetAll, budget, state: s, removeCategory } = useChaiDai()
  const level = levelFromXp(state.xp)
  const weekDone = Math.min(7, state.streak % 7 === 0 && state.streak > 0 ? 7 : state.streak % 7)
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className={PAGE}>
      <header className="mb-4 flex items-center gap-4">
        <div className="relative size-16 overflow-hidden rounded-2xl bg-card">
          <Image src="/images/nong-keb.png" alt="" fill className="object-cover" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Lv.{level.level}</p>
          <h1 className="text-xl font-bold">{level.name}</h1>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${level.progress * 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
            {state.xp} XP · อีก {level.toNext} XP เลเวลถัดไป
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="streak" className="rounded-[2rem] bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="streak" className="text-sm text-muted-foreground">
                  Streak ปัจจุบัน
                </h2>
                <p className="flex items-center gap-2 font-display text-4xl font-bold">
                  <Flame className="size-8 fill-warning text-warning" />
                  {state.streak}
                  <span className="text-base font-medium text-muted-foreground">วัน</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-info/15 px-3 py-1.5 text-info">
                <Snowflake className="size-4" />
                <span className="text-xs font-semibold">Freeze x{state.freezeTokens}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-1.5" aria-label={`สัปดาห์นี้บันทึกแล้ว ${weekDone} จาก 7 วัน`}>
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} className={cn('h-2 flex-1 rounded-full', i < weekDone ? 'bg-warning' : 'bg-secondary')} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">บันทึกครบ 7 วันรับ Streak Freeze ฟรี 1 อัน กันไฟดับวันที่ลืม</p>
          </section>

          <section aria-labelledby="badges">
            <h2 id="badges" className="mb-2 text-sm font-semibold">
              Badges ({state.badges.length}/{BADGES.length})
            </h2>
            <ul className="grid grid-cols-3 gap-2">
              {BADGES.map((b) => {
                const unlocked = state.badges.includes(b.id)
                const Icon = unlocked ? b.icon : Lock
                return (
                  <li key={b.id} className={cn('flex flex-col items-center rounded-2xl bg-card p-3 text-center', !unlocked && 'opacity-50')}>
                    <span className={cn('flex size-11 items-center justify-center rounded-full', unlocked ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                      <Icon className="size-5" />
                    </span>
                    <span className="mt-2 text-xs font-semibold">{b.name}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">{b.description}</span>
                  </li>
                )
              })}
            </ul>
          </section>

          <section aria-labelledby="notif" className="rounded-[2rem] bg-card p-5">
            <h2 id="notif" className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="size-4 text-primary" /> การแจ้งเตือน
            </h2>
            <div className="mt-4 flex rounded-xl bg-secondary p-1" role="radiogroup" aria-label="บุคลิกน้องเก็บ">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={state.profile.tone === t.id}
                  onClick={() => updateProfile({ tone: t.id })}
                  className={cn('flex-1 rounded-lg py-2 text-xs font-semibold', state.profile.tone === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center justify-between text-sm">
              เวลาเตือนประจำวัน
              <input
                type="time"
                value={state.profile.reminderTime}
                onChange={(e) => updateProfile({ reminderTime: e.target.value })}
                className="rounded-lg bg-secondary px-3 py-1.5 font-display font-semibold outline-none"
              />
            </label>
            <p className="mt-4 mb-2 text-xs text-muted-foreground">ทดลองแจ้งเตือนตามบริบท</p>
            <div className="grid grid-cols-2 gap-2">
              <TestButton onClick={() => sendNudge()}>เตือนบันทึกรายวัน</TestButton>
              <TestButton onClick={() => showPush({ title: `ไฟ ${state.streak} วันจะดับใน 2 ชม.!`, body: 'บันทึกสักรายการ หรือกด “ไม่ได้ใช้เงิน” ก็ได้', action: 'add' })}>Streak ใกล้ดับ</TestButton>
              <TestButton onClick={() => showPush({ title: 'เงินเข้าแล้ว', body: `น้องเก็บแอบโอนเข้ากระปุก “${state.profile.goalName}” ให้ก่อนแล้ว งบเดือนนี้พร้อมใช้` })}>เงินเดือนเข้า</TestButton>
              <TestButton onClick={() => showPush({ title: 'ภาษีใกล้สิ้นปีแล้ว', body: 'ลดหย่อนเพิ่มอีกนิด ได้เงินคืนเพิ่ม ลองดูที่โค้ชภาษี', action: 'tax' })}>เตือนลดหย่อนภาษี</TestButton>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              งบต่อวันเฉลี่ย ฿{budget.averageDaily.toLocaleString('th-TH')} · ส่งไม่เกิน 2 ครั้ง/วัน และไม่ส่งซ้ำถ้าบันทึกแล้ว
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="occ" className="rounded-[2rem] bg-card p-5">
            <h2 id="occ" className="text-sm font-semibold">
              อาชีพ
            </h2>
            <input
              value={state.profile.occupation}
              onChange={(e) => updateProfile({ occupation: e.target.value.slice(0, 40) })}
              placeholder="พิมพ์อาชีพของคุณ เช่น กราฟิกดีไซเนอร์"
              aria-label="อาชีพ"
              className="mt-3 h-11 w-full rounded-xl bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {OCCUPATIONS.map((o) => (
                <button key={o} type="button" onClick={() => updateProfile({ occupation: o })} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                  {o}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="bills" className="rounded-[2rem] bg-card p-5">
            <h2 id="bills" className="mb-3 text-sm font-semibold">
              ค่าใช้จ่ายทุกเดือน
            </h2>
            <BillsEditor bills={state.bills} onChange={updateBills} />
          </section>

          <section aria-labelledby="cats" className="rounded-[2rem] bg-card p-5">
            <h2 id="cats" className="text-sm font-semibold">
              หมวดค่าใช้จ่ายของฉัน
            </h2>
            {s.customCategories.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">ยังไม่มีหมวดที่สร้างเอง กด “+ หมวดใหม่” ตอนบันทึกรายจ่ายเพื่อสร้างหมวดของคุณ</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {s.customCategories.map((c) => {
                  const Icon = CUSTOM_ICONS[c.icon] ?? CUSTOM_ICONS.tag
                  return (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl bg-secondary p-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, ${c.color} 18%, transparent)`, color: c.color }}>
                        <Icon className="size-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium">{c.label}</span>
                      <button type="button" onClick={() => removeCategory(c.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive" aria-label={`ลบหมวด ${c.label}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="data" className="rounded-[2rem] bg-card p-5">
            <h2 id="data" className="text-sm font-semibold">
              จัดการข้อมูล
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">ข้อมูลทั้งหมดเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={restart} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-medium hover:bg-accent">
                <RotateCcw className="size-4" /> เริ่ม Onboarding ใหม่
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive/10 text-sm font-medium text-destructive hover:bg-destructive/20"
              >
                <Trash2 className="size-4" /> ล้างข้อมูล
              </button>
            </div>
            {confirmReset && (
              <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 animate-in fade-in" role="alertdialog" aria-label="ยืนยันการล้างข้อมูล">
                <p className="flex items-start gap-2 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                  ล้างข้อมูลทั้งหมด (รายการ สลิป เงินออม การตั้งค่า) แล้วกลับไปเริ่มต้นใหม่ ย้อนกลับไม่ได้
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setConfirmReset(false)} className="h-10 flex-1 rounded-xl bg-secondary text-sm font-medium">
                    ยกเลิก
                  </button>
                  <button type="button" onClick={resetAll} className="h-10 flex-1 rounded-xl bg-destructive text-sm font-semibold text-background">
                    ยืนยันล้างข้อมูล
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function TestButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl bg-secondary px-3 py-2.5 text-xs font-medium hover:bg-accent">
      {children}
    </button>
  )
}
