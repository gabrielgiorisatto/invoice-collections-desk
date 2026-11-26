import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './src/app.ts'
import { openMemoryDatabase } from './src/sqlite-store.ts'
import { availableActions, demoAccount, priorityTier, seedInvoiceIds } from '../domain/index.ts'
import { parseChange } from './src/sessions.ts'

async function sessionApp() {
  const { db, close } = openMemoryDatabase()
  const app = createApp(db)
  const login = await request(app).post('/api/login').send({
    username: demoAccount.username,
    password: demoAccount.password,
  })
  const cookie = login.headers['set-cookie'][0].split(';')[0]
  const first = await request(app).get('/api/invoices').set('Cookie', cookie)
  return {
    app,
    cookie,
    invoices: first.body.invoices as Array<{ id: string; code: string; invoiceAccuracy: string }>,
    close,
  }
}

describe('invoices API', () => {
  it('keeps the desk closed until the demo login sets a session cookie', async () => {
    const { db, close } = openMemoryDatabase()
    const app = createApp(db)
    try {
      const anon = await request(app).get('/api/session')
      expect(anon.status).toBe(200)
      expect(anon.body.authenticated).toBe(false)

      const blocked = await request(app).get('/api/invoices')
      expect(blocked.status).toBe(401)
      expect(blocked.headers['set-cookie']).toBeUndefined()

      const blockedPatch = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .send({ type: 'follow-up', value: { note: 'Called AP', channel: 'Phone', answered: false } })
      expect(blockedPatch.status).toBe(401)

      const bad = await request(app).post('/api/login').send({ username: 'operator', password: 'nope' })
      expect(bad.status).toBe(401)
      expect(bad.headers['set-cookie']).toBeUndefined()

      const login = await request(app).post('/api/login').send({
        username: demoAccount.username,
        password: demoAccount.password,
      })
      expect(login.status).toBe(200)
      expect(login.headers['set-cookie']?.[0]).toMatch(/collections_demo=/)
      expect(login.headers['set-cookie']?.[0]).toMatch(/HttpOnly/)
      expect(login.headers['set-cookie']?.[0]).toMatch(/SameSite=Lax/)
      const cookie = login.headers['set-cookie'][0].split(';')[0]

      const session = await request(app).get('/api/session').set('Cookie', cookie)
      expect(session.body.authenticated).toBe(true)

      const response = await request(app).get('/api/invoices').set('Cookie', cookie)
      expect(response.status).toBe(200)
      expect(response.body.invoices.map((item: { code: string }) => item.code)).toEqual([
        'Aster', 'Brook', 'Crest', 'Dune', 'East', 'Grove',
      ])
    } finally {
      close()
    }
  })

  it('persists a follow-up via PATCH on the same session', async () => {
    const { app, cookie, close } = await sessionApp()
    try {
      const patched = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .set('Cookie', cookie)
        .send({ type: 'follow-up', value: { note: 'Called AP', channel: 'Phone', answered: false } })
      expect(patched.status).toBe(200)
      const brook = patched.body.invoices.find((item: { code: string }) => item.code === 'Brook')
      expect(brook.followUps[0].note).toBe('Called AP')

      const reload = await request(app).get('/api/invoices').set('Cookie', cookie)
      const again = reload.body.invoices.find((item: { code: string }) => item.code === 'Brook')
      expect(again.followUps[0].note).toBe('Called AP')
    } finally {
      close()
    }
  })
})

describe('parseChange UI/API payload shapes', () => {
  it('accepts confirm-details even when note is missing (domain validates emptiness)', () => {
    expect(parseChange({ type: 'confirm-details', value: {} })).toEqual({
      type: 'confirm-details',
      value: { note: '' },
    })
    expect(parseChange({ type: 'confirm-details', value: { note: 'Verified' } })).toEqual({
      type: 'confirm-details',
      value: { note: 'Verified' },
    })
  })

  it('coerces payment amount strings and flag-details notes', () => {
    expect(parseChange({ type: 'payment', value: { amount: '120', note: 'Wire' } })).toEqual({
      type: 'payment',
      value: { amount: 120, note: 'Wire' },
    })
    expect(parseChange({ type: 'flag-details', value: { note: 1 } })).toEqual({
      type: 'flag-details',
      value: { note: '1' },
    })
  })

  it('rejects unknown action kinds as invalid', () => {
    expect(parseChange({ type: 'confirm-verified', value: { note: 'x' } })).toBeUndefined()
    expect(parseChange({ type: 'flag-for-review', value: { note: 'x' } })).toBeUndefined()
  })
})

describe('operator actions via PATCH (happy path + rejection)', () => {
  it('Grove confirm-details verified — allowed by lifecycle, not 400', async () => {
    const { app, cookie, close } = await sessionApp()
    try {
      const groveBefore = (await request(app).get('/api/invoices').set('Cookie', cookie))
        .body.invoices.find((item: { code: string }) => item.code === 'Grove')
      expect(availableActions(groveBefore)).toContain('confirm-details')
      expect(priorityTier(groveBefore)).toBe('P0')

      const emptyNote = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Grove}`)
        .set('Cookie', cookie)
        .send({ type: 'confirm-details', value: {} })
      expect(emptyNote.status).toBe(422)
      expect(emptyNote.body.errors).toHaveProperty('note')

      const patched = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Grove}`)
        .set('Cookie', cookie)
        .send({ type: 'confirm-details', value: { note: 'Bank details confirmed with AP.' } })
      expect(patched.status).toBe(200)
      const grove = patched.body.invoices.find((item: { code: string }) => item.code === 'Grove')
      expect(grove.invoiceAccuracy).toBe('ok')
      expect(priorityTier(grove)).toBe('P1')
    } finally {
      close()
    }
  })

  it('Brook flag-details for review', async () => {
    const { app, cookie, close } = await sessionApp()
    try {
      const patched = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .set('Cookie', cookie)
        .send({ type: 'flag-details', value: { note: 'Remittance address looks wrong.' } })
      expect(patched.status).toBe(200)
      const brook = patched.body.invoices.find((item: { code: string }) => item.code === 'Brook')
      expect(brook.invoiceAccuracy).toBe('unverified_claim')
    } finally {
      close()
    }
  })

  it('Brook promise + payment happy paths', async () => {
    const { app, cookie, close } = await sessionApp()
    try {
      const promised = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .set('Cookie', cookie)
        .send({ type: 'promise', value: { dueDate: '2026-12-01', note: 'Will wire Monday' } })
      expect(promised.status).toBe(200)

      const paid = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .set('Cookie', cookie)
        .send({ type: 'payment', value: { amount: 1800, note: 'Wire received' } })
      expect(paid.status).toBe(200)
      const brook = paid.body.invoices.find((item: { code: string }) => item.code === 'Brook')
      expect(priorityTier(brook)).toBe('P3')
    } finally {
      close()
    }
  })

  it('payment accepts string amount from InputNumber-like clients', async () => {
    const { app, cookie, close } = await sessionApp()
    try {
      const paid = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Brook}`)
        .set('Cookie', cookie)
        .send({ type: 'payment', value: { amount: '100', note: 'Partial' } })
      expect(paid.status).toBe(200)
    } finally {
      close()
    }
  })

  it('Aster dispute update + resolve; Crest accepts follow-up and rejects a second details flag', async () => {
    const { app, cookie, close } = await sessionApp()
    try {
      const dispute = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Aster}`)
        .set('Cookie', cookie)
        .send({ type: 'dispute', value: { reason: 'Qty still wrong', evidence: 'PO', status: 'open' } })
      expect(dispute.status).toBe(200)

      const resolved = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Aster}`)
        .set('Cookie', cookie)
        .send({ type: 'resolve', value: { reason: 'dispute_closed', note: 'Credit memo issued' } })
      expect(resolved.status).toBe(200)

      const followed = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Crest}`)
        .set('Cookie', cookie)
        .send({ type: 'follow-up', value: { note: 'Checked the promise date.', channel: 'Email', answered: false } })
      expect(followed.status).toBe(200)

      const rejected = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Crest}`)
        .set('Cookie', cookie)
        .send({ type: 'confirm-details', value: { note: 'Nothing open to confirm.' } })
      expect(rejected.status).toBe(422)
      expect(rejected.body.errors.form).toMatch(/not available/i)
    } finally {
      close()
    }
  })

  it('Aster route-am on open dispute', async () => {
    const { app, cookie, close } = await sessionApp()
    try {
      const routed = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Aster}`)
        .set('Cookie', cookie)
        .send({ type: 'route-am', value: { note: 'Hand off quantity dispute (simulation).' } })
      expect(routed.status).toBe(200)
      const aster = routed.body.invoices.find((item: { code: string }) => item.code === 'Aster')
      expect(aster.ownerRole).toBe('account_manager')
    } finally {
      close()
    }
  })

  it('rejects unknown action kind with 400 Invalid update', async () => {
    const { app, cookie, close } = await sessionApp()
    try {
      const bad = await request(app)
        .patch(`/api/invoices/${seedInvoiceIds.Grove}`)
        .set('Cookie', cookie)
        .send({ type: 'confirm-verified', value: { note: 'x' } })
      expect(bad.status).toBe(400)
      expect(bad.body.errors.form).toBe('Invalid update.')
    } finally {
      close()
    }
  })
})
