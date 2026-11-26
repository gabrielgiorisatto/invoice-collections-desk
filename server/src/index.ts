import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'
import { createApp } from './app.ts'
import { openFileDatabase } from './sqlite-store.ts'

const root = fileURLToPath(new URL('../..', import.meta.url))
const clientRoot = path.join(root, 'client')
const port = Number(process.env.PORT) || 5173
const production = process.env.NODE_ENV === 'production'

const { db, close } = openFileDatabase()
const app = createApp(db, production ? path.join(clientRoot, 'dist') : undefined)

if (!production) {
  const vite = await createViteServer({
    root: clientRoot,
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`http://0.0.0.0:${port}`)
})
server.on('close', () => close())
