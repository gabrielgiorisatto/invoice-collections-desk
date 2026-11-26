import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './src/app.ts'
import { openMemoryDatabase } from './src/sqlite-store.ts'
import { seedInvoiceIds } from '../domain/seed-ids.ts'

describe('invoices API', () => {
  it('returns seeded invoices and sets a session cookie', async () => {
    const { db, close } = openMemoryDatabase()
    try {
      const app = createApp(db)
      const response = await request(app).get('/api/invoices')
      expect(response.status).toBe(200)
      expect(response.body.invoices.map((item: { code: string }) => item.code)).toEqual([
        'Aster', 'Brook', 'Crest', 'Dune', 'East', 'Grove',
      ])
      expect(response.headers['set-cookie']?.[0]).toMatch(/collections_demo=/)
    } finally {
      close()
    }
  })

  it('persists a follow-up via PATCH on the same session', async () => {
    const { db, close } = openMemoryDatabase()
    try {
      const app = createApp(db)
      const first = await request(app).get('/api/invoices')
      const cookie = first.headers['set-cookie'][0].split(';')[0]
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
