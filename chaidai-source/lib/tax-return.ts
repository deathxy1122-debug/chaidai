import type { IncomeType, TaxResult } from './tax'

export type ReturnLine = { no: string; label: string; amount: number; sub?: boolean; strong?: boolean; note?: string }

export type TaxReturn = {
  formName: string
  formSub: string
  taxYear: number
  occupation: string
  incomeLabel: string
  lines: ReturnLine[]
  result: { label: string; amount: number; kind: 'pay' | 'refund' | 'zero' }
}

export function buildTaxReturn(tax: TaxResult, incomeType: IncomeType, taxYear: number, occupation: string): TaxReturn {
  const salary = incomeType === 'salary'
  const lines: ReturnLine[] = []
  let n = 1
  const add = (l: Omit<ReturnLine, 'no'>, numbered = true) => lines.push({ ...l, no: numbered ? String(n++) : '' })

  add({ label: salary ? 'เงินได้พึงประเมิน 40(1) เงินเดือน ค่าจ้าง' : 'เงินได้พึงประเมิน 40(2) ค่าจ้างทำงาน/ฟรีแลนซ์', amount: tax.annualIncome })
  add({ label: 'หัก ค่าใช้จ่าย (50% ไม่เกิน 100,000)', amount: tax.expense })
  add({ label: 'คงเหลือเงินได้หลังหักค่าใช้จ่าย', amount: tax.annualIncome - tax.expense, strong: true })
  add({ label: 'หัก ค่าลดหย่อนและเงินสนับสนุน', amount: tax.totalAllowances, strong: true })
  tax.allowanceItems.forEach((i) => add({ label: i.label, amount: i.amount, sub: true }, false))
  add({ label: 'เงินได้สุทธิ', amount: tax.net, strong: true })
  add({ label: 'ภาษีคำนวณตามอัตราก้าวหน้า', amount: tax.progressiveTax })
  if (tax.minTax > 0) {
    add({
      label: 'ภาษีขั้นต่ำ 0.5% ของเงินได้พึงประเมิน',
      amount: tax.minTax,
      note: tax.usedMinTax ? 'ใช้ยอดนี้เพราะมากกว่าภาษีขั้นบันได' : 'ภาษีขั้นบันไดสูงกว่า จึงใช้ขั้นบันได',
    })
  }
  add({ label: 'ภาษีที่ต้องเสียทั้งปี', amount: tax.tax, strong: true })
  add({ label: 'หัก ภาษีที่ถูกหัก ณ ที่จ่าย', amount: tax.withheld })

  const bal = tax.balance
  return {
    formName: salary ? 'ภ.ง.ด.91' : 'ภ.ง.ด.90',
    formSub: salary ? 'แบบแสดงรายการภาษีเงินได้บุคคลธรรมดา (เงินได้ 40(1) อย่างเดียว)' : 'แบบแสดงรายการภาษีเงินได้บุคคลธรรมดา (เงินได้ 40(2)–(8))',
    taxYear,
    occupation,
    incomeLabel: salary ? 'มนุษย์เงินเดือน' : 'ฟรีแลนซ์',
    lines,
    result: {
      label: bal > 0 ? 'ภาษีที่ต้องชำระเพิ่ม' : bal < 0 ? 'ภาษีที่ขอคืนได้' : 'ไม่ต้องชำระเพิ่ม',
      amount: Math.abs(bal),
      kind: bal > 0 ? 'pay' : bal < 0 ? 'refund' : 'zero',
    },
  }
}

const fmt = (n: number) => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(Math.round(n))

export function taxReturnText(r: TaxReturn) {
  const out = [
    `สรุปภาษีเงินได้บุคคลธรรมดา ปีภาษี ${r.taxYear} (ฉบับร่างสำหรับ ${r.formName})`,
    `ประเภทเงินได้: ${r.incomeLabel}${r.occupation ? ` · อาชีพ: ${r.occupation}` : ''}`,
    '',
  ]
  r.lines.forEach((l) => out.push(`${l.no ? l.no + '. ' : '   - '}${l.label}: ${fmt(l.amount)} บาท${l.note ? ` (${l.note})` : ''}`))
  out.push('', `${r.result.label}: ${fmt(r.result.amount)} บาท`, '', 'หมายเหตุ: เป็นการประมาณการเพื่อวางแผน ไม่ใช่แบบยื่นทางการ ตรวจสอบและยื่นจริงที่ rd.go.th')
  return out.join('\n')
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

export function taxReturnHtml(r: TaxReturn) {
  const rows = r.lines
    .map(
      (l) =>
        `<tr class="${l.strong ? 's' : ''}${l.sub ? ' sub' : ''}"><td class="no">${esc(l.no)}</td><td>${esc(l.label)}${l.note ? `<br><small>${esc(l.note)}</small>` : ''}</td><td class="n">${fmt(l.amount)}</td></tr>`,
    )
    .join('')
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>สรุปภาษี ${esc(r.formName)} ปี ${r.taxYear}</title>
<style>body{font-family:'IBM Plex Sans Thai',Tahoma,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#111}h1{font-size:20px;margin:0}p{margin:4px 0;color:#555;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}td{padding:8px 6px;border-bottom:1px solid #ddd;vertical-align:top}td.no{width:28px;color:#777}td.n{text-align:right;white-space:nowrap}tr.s td{font-weight:700}tr.sub td{color:#444;padding-left:20px}small{color:#777}.res{margin-top:16px;padding:14px;border:2px solid #111;display:flex;justify-content:space-between;font-weight:700;font-size:18px}.fine{margin-top:16px;font-size:12px;color:#777}</style></head><body>
<h1>${esc(r.formName)} · สรุปภาษีเงินได้บุคคลธรรมดา ปีภาษี ${r.taxYear}</h1><p>${esc(r.formSub)}</p><p>ประเภทเงินได้: ${esc(r.incomeLabel)}${r.occupation ? ` · อาชีพ: ${esc(r.occupation)}` : ''}</p>
<table>${rows}</table><div class="res"><span>${esc(r.result.label)}</span><span>${fmt(r.result.amount)} บาท</span></div>
<p class="fine">ฉบับร่างเพื่อการวางแผนและเปรียบเทียบ ไม่ใช่แบบยื่นทางการ กรุณาตรวจสอบและยื่นจริงที่เว็บไซต์กรมสรรพากร (rd.go.th)</p></body></html>`
}
