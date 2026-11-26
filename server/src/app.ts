import type { IncomingMessage, ServerResponse } from 'node:http'
import express from 'express'
import type { Database } from './database.ts'
import { handleRequest } from './sessions.ts'

async function toRequest(req: IncomingMessage, baseUrl: string): Promise<Request> {
  const url = new URL(req.url ?? '/', baseUrl)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  let body: string | undefined
  if (req.method === 'PATCH' || req.method === 'POST') {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
    body = Buffer.concat(chunks).toString()
  }
  return new Request(url, { method: req.method, headers, body })
}

async function sendResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') res.appendHeader(key, value)
    else res.setHeader(key, value)
  })
  res.end(Buffer.from(await response.arrayBuffer()))
}

export function createApp(db: Database) {
  const app = express()
  app.use(async (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next()
    try {
      await sendResponse(res, await handleRequest(await toRequest(req, `http://${req.headers.host ?? 'localhost'}`), db))
    } catch (error) {
      next(error)
    }
  })
  return app
}
