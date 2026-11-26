import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
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

/** File SQLite. `SQLITE_PATH` points at a Render disk when one is mounted; otherwise the file is local and ephemeral. */
export function openFileDatabase(filePath = process.env.SQLITE_PATH || 'collections.sqlite'): { db: Database; close: () => void } {
  mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true })
  const sqlite = new DatabaseSync(filePath)
  sqlite.exec(readFileSync(schemaPath, 'utf8'))
  return { db: wrapSqlite(sqlite), close: () => sqlite.close() }
}
