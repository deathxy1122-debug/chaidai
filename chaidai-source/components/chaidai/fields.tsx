'use client'

import { baht } from '@/lib/budget'
import { cn } from '@/lib/utils'

export function MoneyInput({
  value,
  onChange,
  className,
  label,
  placeholder,
}: {
  value: number
  onChange: (n: number) => void
  className?: string
  label: string
  placeholder?: string
}) {
  return (
    <input
      inputMode="numeric"
      value={value ? baht(value) : ''}
      placeholder={placeholder ?? '0'}
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
      aria-label={label}
      className={cn('rounded-lg bg-secondary px-2 py-1.5 text-right font-display font-semibold tabular-nums outline-none focus:ring-2 focus:ring-ring', className)}
    />
  )
}

export const PAGE = 'px-5 pt-12 pb-28 md:px-8 lg:px-10 lg:pt-10 lg:pb-12'
