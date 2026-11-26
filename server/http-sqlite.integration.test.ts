import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { demoAccount, seedInvoiceIds, type Invoice } from '../domain/index.ts'
import { createApp } from './src/app.ts'
import type { Database } from './src/database.ts'
import { openFileDatabase, openMemoryDatabase } from './src/sqlite-store.ts'

type SessionRow = { payload: string; revision: number }

function memoryApp() {
  const opened = openMemoryDatabase()
  return { ...opened, app: createApp(opened.db) }
}

async function sessionCount(db: Database) {
  const row = await db.prepare('SELECT COUNT(*) AS count FROM demo_sessions').bind().first<{ count: number }>()
  return Number(row?.count ?? 0)
}

async function sessionRow(db: Database, id: string) {
  return db.prepare('SELECT payload, revision FROM demo_sessions WHERE id = ?').bind(id).first<SessionRow>()
}

function sessionId(setCookie: string) {
  const id = setCookie.match(/collections_demo=([\da-f-]{36})/)?.[1]
  if (!id) throw new Error('session cookie missing')
  return id
}

async function signIn(app: ReturnType<typeof createApp>) {
  const login = await request(app).post('/api/login').send({
    username: demoAccount.username,
    password: demoAccount.password,
  })
  expect(login.status).toBe(200)
  const header = login.headers['set-cookie']?.[0]
  expect(header).toMatch(/collections_demo=/)
  return { cookie: header.split(';')[0], id: sessionId(header) }
}

function byCode(invoices: Invoice[], code: string) {
  const invoice = invoices.find(item => item.code === code)
  if (!invoice) throw new Error(`missing ${code}`)
  return invoice
}

describe('HTTP routes and SQLite session writes', () => {
  it('answers every route, and does not write a session until login succeeds', async () => {
    const { app, db, close } = memoryApp()
    try {
      const session = await request(app).get('/api/session')
      expect(session.status).toBe(200)
      expect(session.body).toEqual({ authenticated: false })

      const badLogin = await request(app).post('/api/login').send({ username: 'operator', password: 'nope' })
      expect(badLogin.status).toBe(401)
      expect(badLogin.headers['set-cookie']).toBeUndefined()

      const malformed = await request(app).post('/api/login').set('content-type', 'application/json').send('{')
      expect(malformed.status).toBe(401)

      const invoices = await request(app).get('/api/invoices')
      expect(invoices.status).toBe(401)
      const blockedPatch = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .send({ type: 'follow-up', value: { note: 'Called', channel: 'Phone', answered: false } })
      expect(blockedPatch.status).toBe(401)

      const unknown = await request(app).get('/api/no-such')
      expect(unknown.status).toBe(404)
      expect(unknown.body.errors.form).toBe('Endpoint not found.')
      expect((await request(app).post('/api/invoices').send({})).status).toBe(404)
      expect((await request(app).put('/api/login').send({})).status).toBe(404)
      expect((await request(app).get(`/api/invoices/${seedInvoiceIds.Brook}`)).status).toBe(404)

      expect(await sessionCount(db)).toBe(0)
    } finally {
      close()
    }
  })

  it('writes the seed into SQLite on login and reads that row back', async () => {
    const { app, db, close } = memoryApp()
    try {
      const login = await request(app).post('/api/login').send({
        username: '  operator  ',
        password: demoAccount.password,
      })
      expect(login.status).toBe(200)
      const header = login.headers['set-cookie']?.[0]
      if (!header) throw new Error('session cookie missing')
      expect(header).toMatch(/HttpOnly/)
      const cookie = header.split(';')[0]
      const id = sessionId(header)
      expect(await sessionCount(db)).toBe(1)
      const stored = await sessionRow(db, id)
      expect(stored?.revision).toBe(0)
      const saved = JSON.parse(stored?.payload ?? '[]') as Invoice[]
      expect(saved.map(item => item.code)).toEqual(['Aster', 'Brook', 'Crest', 'Dune', 'East', 'Grove'])

      const authed = await request(app).get('/api/session').set('Cookie', cookie)
      expect(authed.body).toEqual({ authenticated: true })

      const listed = await request(app).get('/api/invoices').set('Cookie', cookie)
      expect(listed.status).toBe(200)
      expect(listed.body.invoices).toEqual(saved)
      expect((await sessionRow(db, id))?.revision).toBe(0)
      expect(await sessionCount(db)).toBe(1)
    } finally {
      close()
    }
  })

  it('persists every invoice action to the session row and leaves rejected writes unchanged', async () => {
    const { app, db, close } = memoryApp()
    try {
      const { cookie, id } = await signIn(app)
      const before = (await sessionRow(db, id))?.payload

      const empty = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Grove}`)
        .set('Cookie', cookie)
        .send({ type: 'confirm-details', value: { note: '' } })
      expect(empty.status).toBe(422)
      expect(empty.body.errors.note).toBeTruthy()

      const missing = await request(app)
        .patch('/api/invoices/not-a-real-invoice')
        .set('Cookie', cookie)
        .send({ type: 'follow-up', value: { note: 'Nope', channel: 'Email', answered: false } })
      expect(missing.status).toBe(422)
      expect(missing.body.errors.form).toMatch(/not found/i)

      const invalid = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .set('Cookie', cookie)
        .send({ type: 'not-an-action', value: {} })
      expect(invalid.status).toBe(400)

      const huge = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .set('Cookie', cookie)
        .set('content-type', 'application/json')
        .send(JSON.stringify({ type: 'follow-up', value: { note: 'x'.repeat(10_001) } }))
      expect(huge.status).toBe(413)

      expect((await sessionRow(db, id))?.payload).toBe(before)
      expect((await sessionRow(db, id))?.revision).toBe(0)

      const actions: Array<{ id: string; body: object; check: (invoice: Invoice) => void }> = [
        {
          id: seedInvoiceIds.Brook,
          body: { type: 'follow-up', value: { note: 'Called AP', channel: 'Phone', answered: false } },
          check: invoice => expect(invoice.followUps.at(-1)?.note).toBe('Called AP'),
        },
        {
          id: seedInvoiceIds.Brook,
          body: { type: 'flag-details', value: { note: 'Remittance looks wrong.' } },
          check: invoice => expect(invoice.invoiceAccuracy).toBe('unverified_claim'),
        },
        {
          id: seedInvoiceIds.Brook,
          body: { type: 'payment', value: { amount: 100, note: 'Partial wire' } },
          check: invoice => expect(invoice.payments.at(-1)?.amount).toBe(100),
        },
        {
          id: seedInvoiceIds.Dune,
          body: { type: 'promise', value: { dueDate: '2026-12-01', note: 'Will wire Monday' } },
          check: invoice => expect(invoice.promise?.note).toBe('Will wire Monday'),
        },
        {
          id: seedInvoiceIds.Grove,
          body: { type: 'confirm-details', value: { note: 'Bank details confirmed with AP.' } },
          check: invoice => expect(invoice.invoiceAccuracy).toBe('ok'),
        },
        {
          id: seedInvoiceIds.Aster,
          body: { type: 'dispute', value: { reason: 'Qty still wrong', evidence: 'PO', status: 'open' } },
          check: invoice => expect(invoice.dispute?.reason).toBe('Qty still wrong'),
        },
        {
          id: seedInvoiceIds.Aster,
          body: { type: 'route-am', value: { note: 'Hand off quantity dispute (simulation).' } },
          check: invoice => expect(invoice.ownerRole).toBe('account_manager'),
        },
        {
          id: seedInvoiceIds.Crest,
          body: { type: 'resolve', value: { reason: 'other', note: 'Written off for the demo' } },
          check: invoice => expect(invoice.resolved?.note).toBe('Written off for the demo'),
        },
      ]

      for (const [index, action] of actions.entries()) {
        const patched = await request(app).patch(`/api/invoices/${action.id}`).set('Cookie', cookie).send(action.body)
        expect(patched.status).toBe(200)
        const stored = await sessionRow(db, id)
        expect(stored?.revision).toBe(index + 1)
        const saved = JSON.parse(stored?.payload ?? '[]') as Invoice[]
        expect(saved).toEqual(patched.body.invoices)
        action.check(byCode(saved, patched.body.invoices.find((item: Invoice) => item.id === action.id).code))
      }
    } finally {
      close()
    }
  })

  it('recreates the seed row when the cookie is valid but the file was wiped', async () => {
    const { app, db, close } = memoryApp()
    try {
      const id = crypto.randomUUID()
      const response = await request(app).get('/api/invoices').set('Cookie', `collections_demo=${id}`)
      expect(response.status).toBe(200)
      expect(response.body.invoices).toHaveLength(6)
      const stored = await sessionRow(db, id)
      expect(stored?.revision).toBe(0)
      expect(JSON.parse(stored?.payload ?? '[]')).toHaveLength(6)
    } finally {
      close()
    }
  })

  it('keeps invoice actions after the SQLite file is closed and opened again', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'desk-sqlite-'))
    const file = path.join(dir, 'collections.sqlite')
    try {
      const first = openFileDatabase(file)
      const app = createApp(first.db)
      const { cookie, id } = await signIn(app)
      const patched = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .set('Cookie', cookie)
        .send({ type: 'follow-up', value: { note: 'Still here after reopen', channel: 'Email', answered: true } })
      expect(patched.status).toBe(200)
      first.close()

      const second = openFileDatabase(file)
      try {
        const reloaded = createApp(second.db)
        const listed = await request(reloaded).get('/api/invoices').set('Cookie', cookie)
        expect(listed.status).toBe(200)
        const brook = listed.body.invoices.find((item: Invoice) => item.id === seedInvoiceIds.Brook)
        expect(brook.followUps.at(-1).note).toBe('Still here after reopen')
        expect((await sessionRow(second.db, id))?.revision).toBe(1)
      } finally {
        second.close()
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('serves the desk pages from the client build', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'desk-client-'))
    const { db, close } = openMemoryDatabase()
    try {
      await writeFile(path.join(dir, 'index.html'), '<!doctype html><title>Collections Desk</title>')
      const app = createApp(db, dir)
      for (const route of ['/', '/desk', '/desk/']) {
        const response = await request(app).get(route)
        expect(response.status).toBe(200)
        expect(response.text).toContain('Collections Desk')
      }
      const api = await request(app).get('/api/session')
      expect(api.status).toBe(200)
      expect(api.body.authenticated).toBe(false)
    } finally {
      close()
      await rm(dir, { recursive: true, force: true })
    }
  })
})
