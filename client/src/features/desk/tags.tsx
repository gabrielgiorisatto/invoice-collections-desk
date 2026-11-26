import type { PriorityTier } from '@domain/index.ts'

export function PriorityTag({ tier }: { tier: PriorityTier }) {
  const cls =
    tier === 'P0' ? 'p0'
      : tier === 'P1' ? 'p1'
        : tier === 'P2' ? 'p2'
          : 'p3'
  return <span className={`solid-tag ${cls}`}>{tier}</span>
}

const statusClass: Record<string, string> = {
  open: 'status-open',
  promised: 'status-promised',
  'broken promise': 'status-broken',
  disputed: 'status-disputed',
  unverified: 'status-unverified',
  partial: 'status-partial',
  paid: 'status-paid',
  resolved: 'status-resolved',
}

export function StatusTag({ label }: { label: string }) {
  return <span className={`solid-tag ${statusClass[label] ?? 'status-open'}`}>{label}</span>
}
