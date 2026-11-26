import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './src/app.ts'
import { openMemoryDatabase } from './src/sqlite-store.ts'

describe('GET /api/invoices', () => {
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
})
