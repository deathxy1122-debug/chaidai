export async function resizeToJpeg(file: Blob, maxDim: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', quality))
}

export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
}

type SampleFn = ((input: string, opts?: any) => Promise<{ text: string }>) & {
  json: <T = unknown>(input: string, opts?: any) => Promise<T>
  limits: () => Promise<{ images?: unknown }>
}

let samplePromise: Promise<SampleFn | null> | null = null
export function getSample(): Promise<SampleFn | null> {
  if (!samplePromise) {
    const c = (window as any).claude
    samplePromise = c && typeof c.use === 'function' ? Promise.resolve(c.use('sample')).catch(() => null) : Promise.resolve(null)
  }
  return samplePromise
}

export type SlipReading = { amount: number | null; recipient: string | null }

const PROMPT = `นี่คือรูปสลิปโอนเงินหรือหลักฐานการชำระเงินของไทย อ่านจำนวนเงินที่โอนออก/ชำระ (หน่วยบาท) และชื่อผู้รับหรือร้านค้า
ตอบเป็น JSON อย่างเดียว ไม่ต้องอธิบาย รูปแบบ: {"amount": ตัวเลขทศนิยมได้ หรือ null ถ้าไม่ใช่สลิปหรืออ่านไม่ออก, "recipient": ข้อความสั้นๆ หรือ null}
ห้ามนับค่าธรรมเนียมรวมซ้ำ ใช้ยอด "จำนวนเงิน" หลักของรายการเท่านั้น`

export async function readSlip(blob: Blob, signal?: AbortSignal): Promise<SlipReading | 'unavailable'> {
  const sample = await getSample()
  if (!sample) return 'unavailable'
  const caps = await sample.limits().catch(() => null)
  if (!caps || !caps.images) return 'unavailable'
  const out = await sample.json<{ amount?: unknown; recipient?: unknown }>(PROMPT, { images: [blob], modelTier: 'quick', signal })
  const raw = typeof out?.amount === 'string' ? Number(String(out.amount).replace(/,/g, '')) : out?.amount
  const amount = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 && raw < 100_000_000 ? Math.round(raw * 100) / 100 : null
  const recipient = typeof out?.recipient === 'string' && out.recipient.trim() ? out.recipient.trim().slice(0, 40) : null
  return { amount, recipient }
}
