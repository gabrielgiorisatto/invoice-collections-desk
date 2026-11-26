import { Button, Dropdown, Space, Tooltip } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import type { Invoice } from '@domain/index.ts'
import {
  actionCatalog,
  actionDisabledReason,
  actionDisplayOrder,
  primaryActionKind,
  type ActionKind,
} from './primaryAction.ts'

type Props = {
  invoice: Invoice
  onAction: (kind: ActionKind) => void
  layout?: 'buttons' | 'dropdown'
  onDetails?: () => void
}

function ActionButton({
  invoice,
  kind,
  onAction,
}: {
  invoice: Invoice
  kind: ActionKind
  onAction: (kind: ActionKind) => void
}) {
  const meta = actionCatalog[kind]
  const disabledReason = actionDisabledReason(invoice, kind)
  const disabled = Boolean(disabledReason)
  const primary = !disabled && primaryActionKind(invoice) === kind
  const button = (
    <Button
      type={primary ? 'primary' : 'default'}
      danger={kind === 'resolve' && !primary}
      disabled={disabled}
      block
      onClick={() => onAction(kind)}
    >
      {meta.label}
    </Button>
  )
  return (
    <div>
      {disabledReason ? (
        <Tooltip title={disabledReason}>
          <span style={{ display: 'block' }}>{button}</span>
        </Tooltip>
      ) : (
        button
      )}
      <div className="action-hint">{meta.hint}</div>
    </div>
  )
}

export function InvoiceActionButtons({ invoice, onAction }: Omit<Props, 'layout' | 'onDetails'>) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={10}>
      {actionDisplayOrder.map(kind => (
        <ActionButton key={kind} invoice={invoice} kind={kind} onAction={onAction} />
      ))}
    </Space>
  )
}

export function InvoiceRowMenu({ invoice, onAction, onDetails }: Props) {
  const items: MenuProps['items'] = [
    {
      key: 'actions',
      label: 'Actions',
      children: actionDisplayOrder.map(kind => {
        const meta = actionCatalog[kind]
        const reason = actionDisabledReason(invoice, kind)
        const primary = !reason && primaryActionKind(invoice) === kind
        return {
          key: kind,
          disabled: Boolean(reason),
          title: reason ?? meta.hint,
          label: primary ? `${meta.label} · Primary` : meta.label,
          onClick: () => onAction(kind),
        }
      }),
    },
    ...(onDetails
      ? [{ key: 'details', label: 'Details', onClick: () => onDetails() }]
      : []),
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button size="small" onClick={event => event.stopPropagation()}>
        Actions <DownOutlined />
      </Button>
    </Dropdown>
  )
}
