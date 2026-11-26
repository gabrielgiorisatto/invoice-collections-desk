import { Button, Dropdown, Space, Tooltip } from 'antd'
import {
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  DownOutlined,
  FlagOutlined,
  MessageOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import type { ReactNode } from 'react'
import type { Invoice } from '@domain/index.ts'
import {
  actionDisabledReason,
  actionGroups,
  actionPresentation,
  primaryActionKind,
  type ActionKind,
} from './primaryAction.ts'

function actionIcon(kind: ActionKind): ReactNode {
  switch (kind) {
    case 'follow-up':
      return <MessageOutlined />
    case 'flag-details':
      return <FlagOutlined />
    case 'confirm-details':
      return <CheckOutlined />
    case 'cancel-details':
      return <CloseOutlined />
    case 'promise':
      return <CalendarOutlined />
    case 'cancel-promise':
      return <CloseOutlined />
    case 'payment':
      return <DollarOutlined />
    case 'dispute':
      return <WarningOutlined />
    case 'cancel-dispute':
      return <CloseOutlined />
    case 'route-am':
      return <TeamOutlined />
    case 'resolve':
      return <CheckOutlined />
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

type Props = {
  invoice: Invoice
  onAction: (kind: ActionKind) => void
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
  const meta = actionPresentation(invoice, kind)
  const disabledReason = actionDisabledReason(invoice, kind)
  const disabled = Boolean(disabledReason)
  const primary = !disabled && primaryActionKind(invoice) === kind
  const describedBy = disabledReason ? `${kind}-disabled-reason` : `${kind}-hint`
  const button = (
    <Button
      type={primary ? 'primary' : 'default'}
      disabled={disabled}
      block
      icon={actionIcon(kind)}
      aria-label={meta.label}
      aria-describedby={describedBy}
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
      <div
        id={disabledReason ? `${kind}-disabled-reason` : `${kind}-hint`}
        className="action-hint"
      >
        {disabledReason ?? meta.hint}
      </div>
    </div>
  )
}

export function InvoiceActionButtons({ invoice, onAction }: Props) {
  return (
    <div className="action-groups">
      {actionGroups.map(group => (
        <section
          key={group.id}
          className={group.id === 'settlement' ? 'action-group action-group-settlement' : 'action-group'}
          aria-label={group.label}
        >
          <h4 className="action-group-label">{group.label}</h4>
          <Space direction="vertical" style={{ width: '100%' }} size={10}>
            {group.kinds.map(kind => (
              <ActionButton key={kind} invoice={invoice} kind={kind} onAction={onAction} />
            ))}
          </Space>
        </section>
      ))}
    </div>
  )
}

export function InvoiceRowMenu({ invoice, onAction }: Props) {
  const items: MenuProps['items'] = actionGroups.map(group => ({
    type: 'group',
    label: group.label,
    children: group.kinds.map(kind => {
      const meta = actionPresentation(invoice, kind)
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
  }))

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button
        size="small"
        aria-label={`Actions for ${invoice.code}`}
        onClick={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
      >
        Actions <DownOutlined aria-hidden />
      </Button>
    </Dropdown>
  )
}
