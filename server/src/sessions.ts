import { applyChange, demoAccount, seed, type Change, type Invoice, type ResolutionReason } from '../../domain/index.ts'
import type { Database } from './database.ts'

function readInvoices(payload?: string): Invoice[] {
  if (!payload) return seed()
  return JSON.parse(payload) as Invoice[]
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function asAmount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  return undefined
}

/**
 * Parse a UI/API PATCH body into a domain Change.
 * Known action kinds coerce soft field shapes (missing note → "", amount strings, etc.)
 * so lifecycle-allowed actions do not 400 as "Invalid update." — domain returns 422 for empty/invalid fields.
 */
export function parseChange(input: unknown): Change | undefined {
  if (!input || typeof input !== 'object' || !('type' in input)) return
  const body = input as Record<string, unknown>
  const value = (body.value && typeof body.value === 'object'
    ? body.value
    : {}) as Record<string, unknown>

  switch (body.type) {
    case 'follow-up': {
      const note = asString(value.note) ?? ''
      const channel = asString(value.channel) ?? 'Email'
      const answered = asBoolean(value.answered) ?? false
      return { type: 'follow-up', value: { note, channel, answered } }
    }
    case 'promise': {
      const dueDate = asString(value.dueDate)
      if (dueDate === undefined) return
      return { type: 'promise', value: { dueDate, note: asString(value.note) ?? '' } }
    }
    case 'payment': {
      const amount = asAmount(value.amount)
      if (amount === undefined) return
      return { type: 'payment', value: { amount, note: asString(value.note) ?? '' } }
    }
    case 'resolve': {
      const reason = asString(value.reason)
      if (!reason || !['dispute_closed', 'credit_issued', 'other'].includes(reason)) return
      return {
        type: 'resolve',
        value: { reason: reason as ResolutionReason, note: asString(value.note) ?? '' },
      }
    }
    case 'dispute': {
      const reason = asString(value.reason)
      const status = asString(value.status)
      if (reason === undefined) return
      if (status !== 'open' && status !== 'resolved') return
      return {
        type: 'dispute',
        value: {
          reason,
          evidence: asString(value.evidence) ?? '',
          status,
        },
      }
    }
    case 'route-am':
      return { type: 'route-am', value: { note: asString(value.note) ?? '' } }
    case 'flag-details':
      return { type: 'flag-details', value: { note: asString(value.note) ?? '' } }
    case 'confirm-details':
      return { type: 'confirm-details', value: { note: asString(value.note) ?? '' } }
    case 'cancel-details':
      return { type: 'cancel-details', value: { note: asString(value.note) ?? '' } }
    case 'cancel-promise':
      return { type: 'cancel-promise', value: { note: asString(value.note) ?? '' } }
    case 'cancel-dispute':
      return { type: 'cancel-dispute', value: { note: asString(value.note) ?? '' } }
    default:
      return
  }
}

const demoCookieName = 'collections_demo'

function readSessionId(cookieHeader: string | null): string | undefined {
  return cookieHeader?.match(new RegExp(`(?:^|;\\s*)${demoCookieName}=([\\da-f-]{36})(?:;|$)`))?.[1]
}

function demoSessionCookie(id: string, protocol: string): string {
  const secure = protocol === 'https:' ? '; Secure' : ''
  return `${demoCookieName}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`
}

function loginBody(input: unknown): { username: string; password: string } | undefined {
  if (!input || typeof input !== 'object') return
  const body = input as Record<string, unknown>
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  return { username, password }
}

export async function handleRequest(request: Request, db: Database) {
  const url = new URL(request.url)
  const headers = new Headers({ 'cache-control': 'no-store' })
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers })
  const storedId = readSessionId(request.headers.get('cookie'))

  if (request.method === 'GET' && url.pathname === '/api/session') {
    return json({ authenticated: Boolean(storedId) })
  }

  if (request.method === 'POST' && url.pathname === '/api/login') {
    let parsed: unknown
    try { parsed = JSON.parse(await request.text()) } catch { parsed = undefined }
    const credentials = loginBody(parsed)
    const matches = credentials?.username === demoAccount.username
      && credentials.password === demoAccount.password
    if (!matches) return json({ error: 'Those credentials do not match the demo account.' }, 401)
    const id = crypto.randomUUID()
    await db.prepare('INSERT OR IGNORE INTO demo_sessions (id, payload) VALUES (?, ?)')
      .bind(id, JSON.stringify(seed()))
      .run()
    headers.set('set-cookie', demoSessionCookie(id, url.protocol))
    return json({ ok: true })
  }

  const key = url.pathname.match(/^\/api\/invoices\/([A-Za-z0-9-]+)$/)?.[1]
  const invoiceList = request.method === 'GET' && url.pathname === '/api/invoices'
  const invoicePatch = request.method === 'PATCH' && Boolean(key)
  if (!invoiceList && !invoicePatch) return json({ errors: { form: 'Endpoint not found.' } }, 404)
  if (!storedId) return json({ error: 'Sign in to open the desk.' }, 401)

  const id = storedId
  const read = () => db.prepare('SELECT payload, revision FROM demo_sessions WHERE id = ?').bind(id)
    .first<{ payload: string; revision: number }>()

  if (invoiceList) {
    const row = await read()
    const invoices = readInvoices(row?.payload)
    if (!row) {
      await db.prepare('INSERT OR IGNORE INTO demo_sessions (id, payload) VALUES (?, ?)').bind(id, JSON.stringify(invoices)).run()
    }
    return json({ invoices })
  }

  if (request.method === 'PATCH' && key) {
    const raw = await request.text()
    if (raw.length > 10_000) return json({ errors: { form: 'Update is too large.' } }, 413)
    let change: Change | undefined
    try { change = parseChange(JSON.parse(raw)) } catch { /* invalid json */ }
    if (!change) return json({ errors: { form: 'Invalid update.' } }, 400)

    for (let attempt = 0; attempt < 3; attempt++) {
      const row = await read()
      const invoices = readInvoices(row?.payload)
      const result = applyChange(invoices, key, change)
      if (Object.keys(result.errors).length) return json({ errors: result.errors }, 422)
      const payload = JSON.stringify(result.invoices)
      const write = row
        ? db.prepare('UPDATE demo_sessions SET payload = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(payload, id, row.revision)
        : db.prepare('INSERT OR IGNORE INTO demo_sessions (id, payload) VALUES (?, ?)').bind(id, payload)
      if ((await write.run()).meta.changes) return json({ invoices: result.invoices })
    }
    return json({ errors: { form: 'The invoice changed in another tab. Try again.' } }, 409)
  }

  return json({ errors: { form: 'Endpoint not found.' } }, 404)
}
