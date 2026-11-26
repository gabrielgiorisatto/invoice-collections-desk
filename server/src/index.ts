import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import { createApp } from './app.ts'
import { openFileDatabase } from './sqlite-store.ts'

const root = fileURLToPath(new URL('../..', import.meta.url))
const clientRoot = path.join(root, 'client')
const port = Number(process.env.PORT) || 5173
const production = process.env.NODE_ENV === 'production'

const { db, close } = openFileDatabase()
const app = createApp(db)

if (production) {
  const dist = path.join(clientRoot, 'dist')
  app.use(express.static(dist, { index: false }))
  app.get(['/', '/desk', '/desk/'], (_req, res) => res.sendFile(path.join(dist, 'index.html')))
} else {
  const vite = await createViteServer({
    root: clientRoot,
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

const server = app.listen(port, () => {
  console.log(`http://localhost:${port}`)
})
server.on('close', () => close())
