import { seed, type Invoice } from '../../domain/index.ts'
import type { Database } from './database.ts'

function readInvoices(payload?: string): Invoice[] {
  if (!payload) return seed()
  return JSON.parse(payload) as Invoice[]
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

  if (request.method === 'GET' && url.pathname === '/api/invoices') {
    const row = storedId
      ? await db.prepare('SELECT payload, revision FROM demo_sessions WHERE id = ?').bind(id)
        .first<{ payload: string; revision: number }>()
      : null
    const invoices = readInvoices(row?.payload)
    if (!row) {
      await db.prepare('INSERT OR IGNORE INTO demo_sessions (id, payload) VALUES (?, ?)').bind(id, JSON.stringify(invoices)).run()
    }
    return json({ invoices })
  }

  return json({ errors: { form: 'Endpoint not found.' } }, 404)
}
