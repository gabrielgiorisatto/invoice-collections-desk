import type { Change, Invoice } from '@domain/index.ts'

export async function loadInvoices(): Promise<Invoice[]> {
  const response = await fetch('/api/invoices')
  if (!response.ok) throw new Error('Could not load invoices. Try again.')
  return (await response.json()).invoices
}

export async function patchInvoice(id: string, change: Change): Promise<{ invoices?: Invoice[]; errors?: Record<string, string> }> {
  const response = await fetch('/api/invoices/' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(change),
  })
  return response.json()
}
