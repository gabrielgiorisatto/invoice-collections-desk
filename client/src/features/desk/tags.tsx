import { Tag } from 'antd'
import {
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { PriorityTier } from '@domain/index.ts'
import type { StatusKind } from './status.ts'

/** Plain priority code — no colored chip clutter in the table. */
export function PriorityTag({ tier }: { tier: PriorityTier }) {
  return <span>{tier}</span>
}

/** One subtle status tag; strong color only for truly bad states. */
export function StatusTag({ kind, label }: { kind: StatusKind; label: string }) {
  switch (kind) {
    case 'broken':
    case 'disputed':
      return <Tag color="error" icon={<ExclamationCircleOutlined />}>{label}</Tag>
    case 'unverified':
      return <Tag color="warning" icon={<WarningOutlined />}>{label}</Tag>
    default:
      return <Tag>{label}</Tag>
  }
}
