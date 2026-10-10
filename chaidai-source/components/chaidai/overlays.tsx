'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { BADGES } from './catalog'
import { useChaiDai } from './store'

export function PushBanner() {
  const { push, dismissPush, setAddOpen, setTab } = useChaiDai()
  if (!push) return null

  const open = () => {
    if (push.action === 'add') {
      setTab('today')
      setAddOpen(true)
    } else if (push.action === 'tax') setTab('tax')
    dismissPush()
  }

  return (
    <div key={push.id} className="absolute inset-x-3 top-3 z-[60] animate-in slide-in-from-top-6 fade-in duration-300 md:inset-x-auto md:right-6 md:top-6 md:w-96" role="status" aria-live="polite">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-popover/95 p-3 shadow-2xl backdrop-blur">
        <button type="button" onClick={open} className="flex flex-1 items-start gap-3 text-left">
          <span className="relative size-9 shrink-0 overflow-hidden rounded-lg">
            <Image src="/images/nong-keb.png" alt="" fill className="object-cover" />
          </span>
          <span className="flex-1">
            <span className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold tracking-wide">CHAIDAI</span>
              <span>ตอนนี้</span>
            </span>
            <span className="block text-sm font-semibold">{push.title}</span>
            <span className="block text-pretty text-xs text-muted-foreground">{push.body}</span>
          </span>
        </button>
        <button type="button" onClick={dismissPush} className="rounded-full p-1 text-muted-foreground" aria-label="ปิดการแจ้งเตือน">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function BadgeCelebration() {
  const { celebration, clearCelebration, state } = useChaiDai()
  const badge = BADGES.find((b) => b.id === celebration)
  if (!badge) return null
  const Icon = badge.icon

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="badge-title">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in" />
      <div className="relative w-full max-w-sm rounded-[2rem] border border-primary/30 bg-card p-7 text-center animate-in zoom-in-90 fade-in duration-300">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_60px_-10px_var(--primary)] animate-in spin-in-12 duration-500">
          <Icon className="size-11" />
        </div>
        <p className="mt-5 text-xs font-semibold tracking-widest text-primary">BADGE UNLOCKED</p>
        <h2 id="badge-title" className="mt-1 text-2xl font-bold">
          {badge.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{badge.description}</p>
        {badge.id === 'streak-7' && (
          <p className="mt-3 rounded-xl bg-secondary p-3 text-xs">ปลดล็อก Theme “Dark Neon” และได้ Streak Freeze เพิ่ม 1 อัน</p>
        )}
        <p className="mt-3 font-display text-sm text-muted-foreground tabular-nums">รวม {state.xp} XP</p>
        <button type="button" onClick={clearCelebration} className="mt-5 h-12 w-full rounded-2xl bg-primary font-semibold text-primary-foreground">
          เจ๋งไปเลย
        </button>
      </div>
    </div>
  )
}
