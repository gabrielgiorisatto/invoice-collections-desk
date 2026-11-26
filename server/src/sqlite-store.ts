import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import type { Database } from './database.ts'

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url))

export function wrapSqlite(sqlite: DatabaseSync): Database {
  return {
    prepare: sql => ({
      bind: (...values) => ({
        first: async <T>() => (sqlite.prepare(sql).get(...values) as T | undefined) ?? null,
        run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }),
      }),
    }),
  }
}

export function openMemoryDatabase(): { db: Database; close: () => void } {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(schemaPath, 'utf8'))
  return { db: wrapSqlite(sqlite), close: () => sqlite.close() }
}

export function openFileDatabase(path = 'collections.sqlite'): { db: Database; close: () => void } {
  const sqlite = new DatabaseSync(path)
  sqlite.exec(readFileSync(schemaPath, 'utf8'))
  return { db: wrapSqlite(sqlite), close: () => sqlite.close() }
}
