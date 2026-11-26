import { applyChange, seed, type Change, type Invoice } from '../../domain/index.ts'
import type { Database } from './database.ts'

function readInvoices(payload?: string): Invoice[] {
  if (!payload) return seed()
  return JSON.parse(payload) as Invoice[]
}

function parseChange(input: unknown): Change | undefined {
  if (!input || typeof input !== 'object' || !('type' in input)) return
  const body = input as Record<string, unknown>
  const value = body.value as Record<string, unknown> | undefined
  switch (body.type) {
    case 'follow-up':
      if (value && typeof value.note === 'string' && typeof value.channel === 'string' && typeof value.answered === 'boolean') {
        return { type: 'follow-up', value: { note: value.note, channel: value.channel, answered: value.answered } }
      }
      break
    case 'promise':
      if (value && typeof value.dueDate === 'string' && typeof value.note === 'string') {
        return { type: 'promise', value: { dueDate: value.dueDate, note: value.note } }
      }
      break
    case 'payment':
      if (value && typeof value.amount === 'number' && typeof value.note === 'string') {
        return { type: 'payment', value: { amount: value.amount, note: value.note } }
      }
      break
    case 'resolve':
      if (value && typeof value.reason === 'string' && typeof value.note === 'string'
        && ['dispute_closed', 'credit_issued', 'other'].includes(value.reason)) {
        return { type: 'resolve', value: { reason: value.reason as 'dispute_closed' | 'credit_issued' | 'other', note: value.note } }
      }
      break
    case 'dispute':
      if (value && typeof value.reason === 'string' && typeof value.evidence === 'string' && (value.status === 'open' || value.status === 'resolved')) {
        return { type: 'dispute', value: { reason: value.reason, evidence: value.evidence, status: value.status } }
      }
      break
    case 'route-am':
      if (value && typeof value.note === 'string') return { type: 'route-am', value: { note: value.note } }
      break
    case 'verify-accuracy':
      if (value && typeof value.note === 'string') return { type: 'verify-accuracy', value: { note: value.note } }
      break
  }
}

export async function handleRequest(request: Request, db: Database) {
  const url = new URL(request.url)
  const storedId = request.headers.get('cookie')?.match(/(?:^|;\s*)collections_demo=([\da-f-]{36})(?:;|$)/)?.[1]
  const id = storedId ?? crypto.randomUUID()
  const headers = new Headers({ 'cache-control': 'no-store' })
  if (!storedId) {
    headers.set(
      'set-cookie',
      `collections_demo=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${url.protocol === 'https:' ? '; Secure' : ''}`,
    )
  }
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers })
  const read = () => db.prepare('SELECT payload, revision FROM demo_sessions WHERE id = ?').bind(id)
    .first<{ payload: string; revision: number }>()

  if (request.method === 'GET' && url.pathname === '/api/invoices') {
    const row = storedId ? await read() : null
    const invoices = readInvoices(row?.payload)
    if (!row) {
      await db.prepare('INSERT OR IGNORE INTO demo_sessions (id, payload) VALUES (?, ?)').bind(id, JSON.stringify(invoices)).run()
    }
    return json({ invoices })
  }

  const key = url.pathname.match(/^\/api\/invoices\/([A-Za-z0-9-]+)$/)?.[1]
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
