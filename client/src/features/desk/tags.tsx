import type { ReactNode } from 'react'
import { Tag } from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { PriorityTier } from '@domain/index.ts'
import type { StatusKind } from './status.ts'

export function PriorityTag({ tier }: { tier: PriorityTier }) {
  const color =
    tier === 'P0' ? 'error'
      : tier === 'P1' ? 'warning'
        : tier === 'P2' ? 'processing'
          : 'success'
  return <Tag color={color}>{tier}</Tag>
}

type CueTone = 'success' | 'warning' | 'error' | 'default' | 'processing'

function cueForStatus(kind: StatusKind): { color: CueTone; icon: ReactNode } {
  switch (kind) {
    case 'broken':
    case 'disputed':
      return { color: 'error', icon: <ExclamationCircleOutlined /> }
    case 'unverified':
      return { color: 'warning', icon: <WarningOutlined /> }
    case 'promised':
    case 'paid':
    case 'resolved':
      return { color: 'success', icon: <CheckCircleOutlined /> }
    case 'partial':
      return { color: 'processing', icon: <CheckCircleOutlined /> }
    case 'open':
      return { color: 'default', icon: null }
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function StatusTag({ kind, label }: { kind: StatusKind; label: string }) {
  const cue = cueForStatus(kind)
  return (
    <Tag color={cue.color} icon={cue.icon ?? undefined}>
      {label}
    </Tag>
  )
}

export function PromiseCue({ label, tone }: { label: string; tone: 'none' | 'active' | 'broken' }) {
  if (tone === 'broken') {
    return <Tag color="error" icon={<ExclamationCircleOutlined />}>{label}</Tag>
  }
  if (tone === 'active') {
    return <Tag color="success" icon={<CheckCircleOutlined />}>{label}</Tag>
  }
  return <Tag>{label}</Tag>
}

export function DisputeCue({ label, tone }: { label: string; tone: 'none' | 'open' | 'resolved' }) {
  if (tone === 'open') {
    return <Tag color="error" icon={<ExclamationCircleOutlined />}>{label}</Tag>
  }
  if (tone === 'resolved') {
    return <Tag color="success" icon={<CheckCircleOutlined />}>{label}</Tag>
  }
  return <Tag color="success" icon={<CheckCircleOutlined />}>{label}</Tag>
}

export function AccuracyCue({ label, verified }: { label: string; verified: boolean }) {
  if (verified) {
    return <Tag color="success" icon={<CheckCircleOutlined />}>{label}</Tag>
  }
  return <Tag color="warning" icon={<WarningOutlined />}>{label}</Tag>
}
