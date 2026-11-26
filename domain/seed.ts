import { demoDay, type Invoice } from './model.ts'
import { seedInvoiceIds } from './seed-ids.ts'

export { seedInvoiceIds }

function dueDateDaysAgo(days: number): string {
  const date = new Date(`${demoDay}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function relativeDay(offset: number): string {
  const date = new Date(`${demoDay}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

/** Six seeded invoices relative to demoDay (Aster–Grove). */
export function seed(): Invoice[] {
  return [
    {
      id: seedInvoiceIds.Aster,
      code: 'Aster',
      customer: 'Aster Logistics',
      amount: 12_000,
      currency: 'USD',
      dueDate: dueDateDaysAgo(45),
      ownerRole: 'operator',
      accountManager: 'Jordan Lee',
      followUps: [],
      payments: [],
      invoiceAccuracy: 'ok',
      dispute: {
        reason: 'Customer disputes quantity on the shipment; evidence not reconciled.',
        evidence: 'PO vs packing slip mismatch noted by AP.',
        status: 'open',
      },
    },
    {
      id: seedInvoiceIds.Brook,
      code: 'Brook',
      customer: 'Brook Retail Co.',
      amount: 1_800,
      currency: 'USD',
      dueDate: dueDateDaysAgo(10),
      ownerRole: 'operator',
      accountManager: 'Sam Ortiz',
      followUps: [],
      payments: [],
      invoiceAccuracy: 'ok',
    },
    {
      id: seedInvoiceIds.Crest,
      code: 'Crest',
      customer: 'Crest Manufacturing',
      amount: 6_000,
      currency: 'USD',
      dueDate: dueDateDaysAgo(20),
      ownerRole: 'operator',
      accountManager: 'Sam Ortiz',
      followUps: [
        {
          at: relativeDay(-7),
          note: 'Customer committed to wire after their AP cycle.',
          channel: 'Email',
          answered: true,
        },
      ],
      payments: [],
      invoiceAccuracy: 'ok',
      promise: {
        dueDate: relativeDay(2),
        note: 'AP lead promised payment in two days.',
        recordedAt: relativeDay(-1),
      },
    },
    {
      id: seedInvoiceIds.Dune,
      code: 'Dune',
      customer: 'Dune Systems',
      amount: 3_500,
      currency: 'USD',
      dueDate: dueDateDaysAgo(30),
      ownerRole: 'operator',
      accountManager: 'Jordan Lee',
      followUps: [
        {
          at: relativeDay(-12),
          note: 'Left voicemail requesting payment timeline.',
          channel: 'Phone',
          answered: true,
        },
      ],
      payments: [],
      invoiceAccuracy: 'ok',
      promise: {
        dueDate: relativeDay(-5),
        note: 'Controller promised payment five days ago; still unpaid.',
        recordedAt: relativeDay(-8),
      },
    },
    {
      id: seedInvoiceIds.East,
      code: 'East',
      customer: 'East Harbor Group',
      amount: 9_000,
      currency: 'USD',
      dueDate: dueDateDaysAgo(60),
      ownerRole: 'operator',
      accountManager: 'Alex Chen',
      followUps: [
        {
          at: relativeDay(-21),
          note: 'Reminder email — no reply.',
          channel: 'Email',
          answered: false,
        },
        {
          at: relativeDay(-10),
          note: 'Second reminder with statement attached — no reply.',
          channel: 'Email',
          answered: false,
        },
      ],
      payments: [],
      invoiceAccuracy: 'ok',
    },
    {
      id: seedInvoiceIds.Grove,
      code: 'Grove',
      customer: 'Grove Foods',
      amount: 2_400,
      currency: 'USD',
      dueDate: dueDateDaysAgo(5),
      ownerRole: 'operator',
      accountManager: 'Alex Chen',
      followUps: [
        {
          at: relativeDay(-2),
          note: 'Customer said remittance details look wrong; not verified internally.',
          channel: 'Email',
          answered: true,
        },
      ],
      payments: [],
      invoiceAccuracy: 'unverified_claim',
    },
  ]
}
