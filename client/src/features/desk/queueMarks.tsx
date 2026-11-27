import type { PriorityTier } from '@domain/index.ts'
import { glancePriority, priorityToneClass, type GlanceTone } from './tableGlance.ts'

function barCount(tier: PriorityTier): number {
  switch (tier) {
    case 'P0':
      return 4
    case 'P1':
      return 3
    case 'P2':
      return 2
    case 'P3':
      return 1
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}

function SignalBars({ tier }: { tier: PriorityTier }) {
  const filled = barCount(tier)
  const heights = [4, 7, 10, 13]
  return (
    <svg className="signal-bars" width="16" height="13" viewBox="0 0 16 13" aria-hidden="true">
      {heights.map((height, index) => (
        <rect
          key={height}
          x={index * 4}
          y={13 - height}
          width="2.5"
          height={height}
          rx="0.5"
          fill="currentColor"
          opacity={index < filled ? 1 : 0.22}
        />
      ))}
    </svg>
  )
}

export function PriorityTag({ tier }: { tier: PriorityTier }) {
  return (
    <span className={`table-tag ${priorityToneClass(tier)}`}>
      <SignalBars tier={tier} />
      {glancePriority(tier)}
    </span>
  )
}

export function StatusTag({ label, tone }: { label: string; tone: GlanceTone }) {
  return (
    <span className={`table-tag tone-${tone}`}>
      <span className="status-mark" aria-hidden="true" />
      {label}
    </span>
  )
}

export function TableTag({ label, tone }: { label: string; tone: GlanceTone }) {
  if (label === '—') return <span className="cell-dash">—</span>
  return <span className={`table-tag tone-${tone}`}>{label}</span>
}
