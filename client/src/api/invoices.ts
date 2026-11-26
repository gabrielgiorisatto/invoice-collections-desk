import type { Invoice } from '@domain/index.ts'

export async function loadInvoices(): Promise<Invoice[]> {
  const response = await fetch('/api/invoices')
  if (!response.ok) throw new Error('Could not load invoices. Try again.')
  return (await response.json()).invoices
}
