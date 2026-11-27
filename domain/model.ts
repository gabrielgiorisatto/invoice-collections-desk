/** Fixed demo calendar day — all seed relative dates hang off this. */
export const demoDay = '2026-11-26'

/** Morning follow-up capacity for the finance operator. */
export const morningCapacity = 3

export type PromiseStatus = 'none' | 'active' | 'broken'
export type DisputeStatus = 'none' | 'open' | 'resolved'
export type InvoiceAccuracy = 'ok' | 'unverified_claim'
export type OwnerRole = 'operator' | 'account_manager'
export type Settlement = 'open' | 'partial' | 'paid'
export type ResolutionReason = 'dispute_closed' | 'credit_issued' | 'other'
export type PriorityTier = 'P0' | 'P1' | 'P2' | 'P3'

export type FollowUp = {
  at: string
  note: string
  channel: string
  answered: boolean
}

export type Payment = {
  at: string
  amount: number
  note: string
}

export type PromiseRecord = {
  dueDate: string
  note: string
  recordedAt: string
}

export type Dispute = {
  reason: string
  evidence: string
  status: DisputeStatus
}

export type InvoiceEvent = {
  id: string
  at: string
  title: string
  detail: string
}

export const historyLimit = 20

export type Invoice = {
  id: string
  code: string
  customer: string
  amount: number
  currency: 'USD'
  dueDate: string
  ownerRole: OwnerRole
  accountManager: string
  followUps: FollowUp[]
  payments: Payment[]
  invoiceAccuracy: InvoiceAccuracy
  promise?: PromiseRecord
  dispute?: Dispute
  resolved?: { reason: ResolutionReason; note: string; at: string }
  history?: InvoiceEvent[]
}

export const invoiceKey = (invoice: Invoice) => invoice.id

export type Change =
  | { type: 'follow-up'; value: { note: string; channel: string; answered: boolean } }
  | { type: 'flag-details'; value: { note: string } }
  | { type: 'confirm-details'; value: { note: string } }
  | { type: 'cancel-details'; value: { note: string } }
  | { type: 'promise'; value: { dueDate: string; note: string } }
  | { type: 'cancel-promise'; value: { note: string } }
  | { type: 'payment'; value: { amount: number; note: string } }
  | { type: 'dispute'; value: { reason: string; evidence: string; status: 'open' | 'resolved' } }
  | { type: 'cancel-dispute'; value: { note: string } }
  | { type: 'route-am'; value: { note: string } }
  | { type: 'resolve'; value: { reason: ResolutionReason; note: string } }
