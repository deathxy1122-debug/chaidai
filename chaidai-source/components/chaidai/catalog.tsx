import {
  Award,
  BookOpen,
  Bus,
  Clapperboard,
  Coffee,
  Droplet,
  Dumbbell,
  Flame,
  Gamepad2,
  Gift,
  Heart,
  HeartPulse,
  House,
  type LucideIcon,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  ReceiptText,
  ShoppingBag,
  Shirt,
  Smartphone,
  Snowflake,
  Star,
  Tag,
  Trophy,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react'

export type Category = { id: string; label: string; icon: LucideIcon; color: string }

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'อาหาร', icon: Utensils, color: 'var(--chart-3)' },
  { id: 'coffee', label: 'กาแฟ/ชานม', icon: Coffee, color: 'var(--chart-5)' },
  { id: 'transport', label: 'เดินทาง', icon: Bus, color: 'var(--chart-2)' },
  { id: 'shopping', label: 'ช้อปปิ้ง', icon: ShoppingBag, color: 'var(--chart-4)' },
  { id: 'fun', label: 'บันเทิง', icon: Gamepad2, color: 'var(--chart-1)' },
  { id: 'health', label: 'สุขภาพ', icon: HeartPulse, color: 'var(--chart-2)' },
  { id: 'clothes', label: 'เสื้อผ้า', icon: Shirt, color: 'var(--chart-5)' },
]

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]

export type CustomCategory = { id: string; label: string; color: string; icon: string }

export const CUSTOM_ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  gift: Gift,
  dumbbell: Dumbbell,
  paw: PawPrint,
  book: BookOpen,
  plane: Plane,
  heart: Heart,
  music: Music,
}

export const CUSTOM_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export const INCOME_CATEGORY: Category = { id: 'income', label: 'รายรับ', icon: Wallet, color: 'var(--primary)' }

export function resolveCategory(id: string, custom: CustomCategory[]): Category {
  const base = CATEGORIES.find((c) => c.id === id)
  if (base) return base
  if (id === INCOME_CATEGORY.id) return INCOME_CATEGORY
  const c = custom.find((x) => x.id === id)
  if (c) return { id: c.id, label: c.label, icon: CUSTOM_ICONS[c.icon] ?? Tag, color: c.color }
  return { id, label: 'อื่นๆ', icon: Tag, color: 'var(--muted-foreground)' }
}

export const BILL_PRESETS: { id: string; name: string; icon: LucideIcon; amount: number }[] = [
  { id: 'rent', name: 'ค่าหอ/ค่าเช่า', icon: House, amount: 6500 },
  { id: 'electric', name: 'ค่าไฟ', icon: Zap, amount: 900 },
  { id: 'water', name: 'ค่าน้ำ', icon: Droplet, amount: 150 },
  { id: 'phone', name: 'ค่าโทรศัพท์', icon: Smartphone, amount: 499 },
  { id: 'internet', name: 'อินเทอร์เน็ต', icon: Wifi, amount: 599 },
  { id: 'stream', name: 'สตรีมมิ่ง', icon: Clapperboard, amount: 419 },
]

export const billIcon = (id: string) => BILL_PRESETS.find((b) => b.id === id)?.icon ?? ReceiptText

export type Badge = { id: string; name: string; description: string; icon: LucideIcon }

export const BADGES: Badge[] = [
  { id: 'first-step', name: 'ก้าวแรก', description: 'บันทึกรายการแรก', icon: Star },
  { id: 'streak-7', name: '7 วันไฟลุก', description: 'บันทึกติดกัน 7 วัน', icon: Flame },
  { id: 'no-spend', name: 'วันไม่ช็อป', description: 'มี No-Spend Day 1 วัน', icon: Snowflake },
  { id: 'tax-hunter', name: 'นักล่าลดหย่อน', description: 'ใช้สิทธิ์ลดหย่อนครั้งแรก', icon: Award },
  { id: 'streak-30', name: 'วินัยเหล็ก', description: 'บันทึกติดกัน 30 วัน', icon: Trophy },
  { id: 'saver', name: 'ออมครบเป้า', description: 'ออมครบเป้าหมายรายเดือน', icon: PiggyBank },
]

export const LEVELS = ['มือใหม่หัดเก็บ', 'นักออมฝึกหัด', 'นักออมตัวจริง', 'เซียนภาษี', 'เศรษฐีในอนาคต']

export function levelFromXp(xp: number) {
  const level = Math.min(LEVELS.length, Math.floor(xp / 200) + 1)
  return { level, name: LEVELS[level - 1], progress: (xp % 200) / 200, toNext: 200 - (xp % 200) }
}
