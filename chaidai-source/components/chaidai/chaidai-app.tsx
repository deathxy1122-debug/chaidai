'use client'

import Image from 'next/image'
import { ChartPie, Flame, House, Plus, ReceiptText, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DaySheet } from './day-sheet'
import { InsightsScreen } from './insights-screen'
import { MeScreen } from './me-screen'
import { Onboarding } from './onboarding'
import { BadgeCelebration, PushBanner } from './overlays'
import { QuickAddSheet } from './quick-add-sheet'
import { ChaiDaiProvider, type Tab, useChaiDai } from './store'
import { TaxScreen } from './tax-screen'
import { TodayScreen } from './today-screen'

export function ChaiDaiApp() {
  return (
    <ChaiDaiProvider>
      <Shell />
    </ChaiDaiProvider>
  )
}

function Shell() {
  const { state } = useChaiDai()
  return (
    <div className="flex h-full w-full bg-background">
      {state.onboarded && <Sidebar />}
      <main className="relative h-full min-w-0 flex-1 overflow-hidden bg-background">
        <Screens />
      </main>
    </div>
  )
}

function Screens() {
  const { state, tab } = useChaiDai()

  if (!state.onboarded) {
    return (
      <div className="no-scrollbar h-full overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-md md:max-w-xl md:items-center md:p-8">
          <div className="h-full w-full md:h-auto md:min-h-[44rem] md:rounded-[2.5rem] md:border md:border-border md:bg-card/30 md:px-4 md:shadow-[0_40px_120px_-40px_rgba(200,242,60,0.2)]">
            <Onboarding />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div key={tab} className="no-scrollbar h-full overflow-y-auto animate-in fade-in duration-200">
        <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-6xl">
          {tab === 'today' && <TodayScreen />}
          {tab === 'insights' && <InsightsScreen />}
          {tab === 'tax' && <TaxScreen />}
          {tab === 'me' && <MeScreen />}
        </div>
      </div>
      <BottomNav />
      <DaySheet />
      <QuickAddSheet />
      <PushBanner />
      <BadgeCelebration />
    </>
  )
}

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'today', label: 'วันนี้', icon: House },
  { id: 'insights', label: 'ภาพรวม', icon: ChartPie },
  { id: 'tax', label: 'ภาษี', icon: ReceiptText },
  { id: 'me', label: 'ฉัน', icon: User },
]

function Sidebar() {
  const { tab, setTab, openAdd, state } = useChaiDai()
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/40 p-6 lg:flex">
      <div className="flex items-center gap-3">
        <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-card">
          <Image src="/images/nong-keb.png" alt="" fill className="object-cover" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold tracking-widest text-primary">CHAIDAI</p>
          <p className="text-xs text-muted-foreground">ใช้ได้ · งบใช้ได้จริงรายวัน</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openAdd()}
        className="mt-8 flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_var(--primary)] transition-transform active:scale-[0.98]"
      >
        <Plus className="size-5" strokeWidth={2.5} /> บันทึกรายการ
      </button>

      <nav aria-label="เมนูหลัก" className="mt-6 flex flex-col gap-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="size-5" />
              {t.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2 rounded-2xl bg-card p-4">
        <Flame className={cn('size-5', state.loggedToday ? 'fill-warning text-warning' : 'text-muted-foreground')} />
        <span className="font-display text-lg font-bold tabular-nums">{state.streak}</span>
        <span className="text-xs text-muted-foreground">วัน Streak</span>
      </div>
    </aside>
  )
}

function BottomNav() {
  const { tab, setTab, openAdd } = useChaiDai()
  const renderTab = (t: (typeof TABS)[number]) => {
    const Icon = t.icon
    const active = tab === t.id
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setTab(t.id)}
        aria-current={active ? 'page' : undefined}
        className={cn('flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}
      >
        <Icon className="size-5" />
        {t.label}
      </button>
    )
  }

  return (
    <nav aria-label="เมนูหลัก" className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-3 pt-2 pb-5 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center md:max-w-xl">
        {TABS.slice(0, 2).map(renderTab)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={() => openAdd()}
            className="-mt-7 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_var(--primary)] transition-transform active:scale-95"
            aria-label="บันทึกรายการ"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </button>
        </div>
        {TABS.slice(2).map(renderTab)}
      </div>
    </nav>
  )
}
