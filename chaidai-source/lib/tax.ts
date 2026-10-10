export type IncomeType = 'salary' | 'freelance'
export type DeductionKey = 'lifeIns' | 'healthIns' | 'rmf' | 'thaiEsg'
export type Deductions = Record<DeductionKey, number>

export type Allowances = {
  spouse: boolean
  children: number
  parents: number
  pvd: number
  mortgage: number
  donation: number
}

export const EMPTY_ALLOWANCES: Allowances = { spouse: false, children: 0, parents: 0, pvd: 0, mortgage: 0, donation: 0 }

export const TAX_BRACKETS = [
  { lower: 0, upper: 150_000, rate: 0 },
  { lower: 150_000, upper: 300_000, rate: 0.05 },
  { lower: 300_000, upper: 500_000, rate: 0.1 },
  { lower: 500_000, upper: 750_000, rate: 0.15 },
  { lower: 750_000, upper: 1_000_000, rate: 0.2 },
  { lower: 1_000_000, upper: 2_000_000, rate: 0.25 },
  { lower: 2_000_000, upper: 5_000_000, rate: 0.3 },
  { lower: 5_000_000, upper: Infinity, rate: 0.35 },
] as const

export const DEDUCTION_META: Record<DeductionKey, { label: string; hint: string }> = {
  lifeIns: { label: 'ประกันชีวิต', hint: 'สูงสุด 100,000 (รวมกับประกันสุขภาพ)' },
  healthIns: { label: 'ประกันสุขภาพ', hint: 'สูงสุด 25,000' },
  rmf: { label: 'กองทุน RMF', hint: '30% ของรายได้ ไม่เกิน 500,000 (รวมกองทุนสำรองเลี้ยงชีพ)' },
  thaiEsg: { label: 'กองทุน Thai ESG', hint: '30% ของรายได้ ไม่เกิน 300,000' },
}

export const EMPTY_DEDUCTIONS: Deductions = { lifeIns: 0, healthIns: 0, rmf: 0, thaiEsg: 0 }

export function calcProgressiveTax(netIncome: number) {
  let tax = 0
  let bracketIndex = 0
  TAX_BRACKETS.forEach((b, i) => {
    if (netIncome > b.lower) {
      tax += (Math.min(netIncome, b.upper) - b.lower) * b.rate
      bracketIndex = i
    }
  })
  return { tax: Math.round(tax), bracketIndex, marginalRate: TAX_BRACKETS[bracketIndex].rate }
}

function pvdClamped(annualIncome: number, a: Allowances) {
  return Math.max(0, Math.min(a.pvd, annualIncome * 0.15, 500_000))
}

function maxFor(key: DeductionKey, annualIncome: number, d: Deductions, a: Allowances) {
  switch (key) {
    case 'lifeIns':
      return Math.max(0, 100_000 - d.healthIns)
    case 'healthIns':
      return Math.min(25_000, Math.max(0, 100_000 - d.lifeIns))
    case 'rmf':
      return Math.max(0, Math.min(annualIncome * 0.3, 500_000 - pvdClamped(annualIncome, a)))
    case 'thaiEsg':
      return Math.min(annualIncome * 0.3, 300_000)
  }
}

export function remainingCap(key: DeductionKey, annualIncome: number, d: Deductions, a: Allowances = EMPTY_ALLOWANCES) {
  return Math.max(0, Math.floor(maxFor(key, annualIncome, d, a) - d[key]))
}

function clampedFunds(annualIncome: number, d: Deductions, a: Allowances) {
  const health = Math.min(d.healthIns, 25_000)
  const life = Math.min(d.lifeIns, 100_000 - health)
  const rmf = Math.min(d.rmf, maxFor('rmf', annualIncome, d, a))
  const esg = Math.min(d.thaiEsg, maxFor('thaiEsg', annualIncome, d, a))
  return { life, health, rmf, esg }
}

export type AllowanceItem = { key: string; label: string; amount: number }

export function computeTax(annualIncome: number, incomeType: IncomeType, d: Deductions, a: Allowances = EMPTY_ALLOWANCES) {
  const expense = Math.min(annualIncome * 0.5, 100_000)
  const personal = 60_000
  const socialSecurity = incomeType === 'salary' ? Math.min(annualIncome * 0.05, 9_000) : 0
  const base = expense + personal + socialSecurity

  const funds = clampedFunds(annualIncome, d, a)
  const spouse = a.spouse ? 60_000 : 0
  const children = Math.max(0, Math.floor(a.children)) * 30_000
  const parents = Math.min(4, Math.max(0, Math.floor(a.parents))) * 30_000
  const mortgage = Math.min(Math.max(0, a.mortgage), 100_000)
  const pvd = pvdClamped(annualIncome, a)

  const beforeDonation = Math.max(
    0,
    annualIncome - base - funds.life - funds.health - funds.rmf - funds.esg - spouse - children - parents - mortgage - pvd,
  )
  const donation = Math.min(Math.max(0, a.donation), beforeDonation * 0.1)

  const extra = funds.life + funds.health + funds.rmf + funds.esg + spouse + children + parents + mortgage + pvd + donation

  const allowanceItems: AllowanceItem[] = [
    { key: 'personal', label: 'ลดหย่อนส่วนตัว', amount: personal },
    { key: 'socialSecurity', label: 'เงินสมทบประกันสังคม', amount: socialSecurity },
    { key: 'spouse', label: 'คู่สมรส (ไม่มีเงินได้)', amount: spouse },
    { key: 'children', label: 'บุตร', amount: children },
    { key: 'parents', label: 'บิดา/มารดา', amount: parents },
    { key: 'mortgage', label: 'ดอกเบี้ยเงินกู้ที่อยู่อาศัย', amount: mortgage },
    { key: 'pvd', label: 'กองทุนสำรองเลี้ยงชีพ/กบข.', amount: pvd },
    { key: 'lifeIns', label: 'เบี้ยประกันชีวิต', amount: funds.life },
    { key: 'healthIns', label: 'เบี้ยประกันสุขภาพ', amount: funds.health },
    { key: 'rmf', label: 'กองทุน RMF', amount: funds.rmf },
    { key: 'thaiEsg', label: 'กองทุน Thai ESG', amount: funds.esg },
    { key: 'donation', label: 'เงินบริจาค', amount: donation },
  ].filter((i) => i.amount > 0)

  const net = Math.max(0, annualIncome - base - extra)
  const result = calcProgressiveTax(net)
  const baseline = calcProgressiveTax(Math.max(0, annualIncome - base))

  const brackets = TAX_BRACKETS.map((b) => {
    const taxable = Math.max(0, Math.min(net, b.upper) - b.lower)
    return { rate: b.rate, lower: b.lower, upper: b.upper, taxable, tax: Math.round(taxable * b.rate) }
  })

  const minTax = incomeType === 'freelance' && annualIncome > 120_000 ? Math.round(annualIncome * 0.005) : 0
  const tax = Math.max(result.tax, minTax)

  const withheld = incomeType === 'salary' ? baseline.tax : 0
  const bracket = TAX_BRACKETS[result.bracketIndex]

  return {
    annualIncome,
    expense,
    personal,
    socialSecurity,
    extraDeductions: extra,
    totalAllowances: personal + socialSecurity + extra,
    allowanceItems,
    net,
    brackets,
    progressiveTax: result.tax,
    minTax,
    usedMinTax: minTax > result.tax,
    taxWithoutExtra: baseline.tax,
    tax,
    marginalRate: result.marginalRate,
    bracketIndex: result.bracketIndex,
    withheld,
    balance: tax - withheld,
    toNextBracket: Number.isFinite(bracket.upper) ? bracket.upper - net : null,
    toLowerBracket: result.bracketIndex > 0 ? net - bracket.lower : null,
  }
}

export type TaxResult = ReturnType<typeof computeTax>

export function taxSavedBy(
  annualIncome: number,
  incomeType: IncomeType,
  d: Deductions,
  key: DeductionKey,
  amount: number,
  a: Allowances = EMPTY_ALLOWANCES,
) {
  const before = computeTax(annualIncome, incomeType, d, a).tax
  const after = computeTax(annualIncome, incomeType, { ...d, [key]: d[key] + amount }, a).tax
  return before - after
}

export function buildSuggestions(annualIncome: number, incomeType: IncomeType, d: Deductions, a: Allowances = EMPTY_ALLOWANCES) {
  const current = computeTax(annualIncome, incomeType, d, a)
  if (current.tax === 0) return []

  const keys: DeductionKey[] = ['rmf', 'thaiEsg', 'healthIns', 'lifeIns']
  return keys
    .map((key) => {
      const cap = remainingCap(key, annualIncome, d, a)
      if (cap <= 0) return null
      const drop = current.toLowerBracket
      const target = drop && drop <= cap ? drop + 1 : Math.min(cap, 30_000)
      const amount = Math.min(cap, Math.ceil(target / 1000) * 1000)
      const saved = taxSavedBy(annualIncome, incomeType, d, key, amount, a)
      if (saved <= 0) return null
      return { key, amount, saved, dropsBracket: Boolean(drop && amount > drop) }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a2, b2) => b2.saved / b2.amount - a2.saved / a2.amount || b2.saved - a2.saved)
    .slice(0, 3)
}
