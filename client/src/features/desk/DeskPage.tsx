import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  App,
  Descriptions,
  Drawer,
  Empty,
  Layout,
  Menu,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  BookOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FlagOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import {
  demoDay,
  disputeStatus,
  explainPriority,
  inActiveQueue,
  morningCapacity,
  overdueDays,
  priorityTier,
  promiseStatus,
  remaining,
  todaysThree,
  totalFollowUps,
  totalPayments,
  type Invoice,
} from '@domain/index.ts'
import { loadInvoices } from '../../api/invoices.ts'
import { invoiceStatus } from './status.ts'
import { PriorityTag, StatusTag } from './tags.tsx'
import ActionModal from './ActionModal.tsx'
import { InvoiceActionButtons, InvoiceRowMenu } from './InvoiceActions.tsx'
import {
  invoiceAccuracyLabel,
  invoiceDisputeLabel,
  invoicePromiseLabel,
  ownerLabel,
} from './labels.ts'
import type { ActionKind } from './primaryAction.ts'

const { Sider, Content } = Layout
const { Title, Text } = Typography

const tierOrder = { P0: 0, P1: 1, P2: 2, P3: 3 } as const

function money(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function InvoiceDetailPanel({
  invoice,
  onAction,
}: {
  invoice: Invoice
  onAction: (kind: ActionKind) => void
}) {
  return (
    <div className="row-expand">
      <Text type="secondary">{explainPriority(invoice).reason}</Text>
      <Descriptions
        size="small"
        column={2}
        style={{ marginTop: 12, marginBottom: 16 }}
        items={[
          {
            key: 'remaining',
            label: 'Remaining',
            children: `${money(remaining(invoice))} of ${money(invoice.amount)}`,
          },
          {
            key: 'overdue',
            label: 'Overdue',
            children: `${overdueDays(invoice)} days`,
          },
          {
            key: 'promise',
            label: 'Promise',
            children: invoicePromiseLabel(invoice),
          },
          {
            key: 'dispute',
            label: 'Dispute',
            children: invoiceDisputeLabel(invoice),
          },
          {
            key: 'accuracy',
            label: 'Invoice details',
            children: invoiceAccuracyLabel(invoice),
          },
          {
            key: 'owner',
            label: 'Owner',
            children: ownerLabel(invoice.ownerRole),
          },
          {
            key: 'am',
            label: 'Account manager',
            children: invoice.accountManager,
          },
          {
            key: 'followups',
            label: 'Follow-ups',
            children: invoice.followUps.length === 0 ? 'None' : String(invoice.followUps.length),
          },
        ]}
      />
      <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Actions</Title>
      <InvoiceActionButtons invoice={invoice} onAction={onAction} />
    </div>
  )
}

export default function DeskPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [nav, setNav] = useState('desk')
  const [actionTarget, setActionTarget] = useState<{ id: string; kind: ActionKind } | null>(null)
  const { message } = App.useApp()

  useEffect(() => {
    let alive = true
    loadInvoices()
      .then(items => {
        if (!alive) return
        setInvoices(items)
      })
      .catch(() => {
        if (alive) setError('Could not load invoices.')
      })
    return () => {
      alive = false
    }
  }, [])

  const picks = useMemo(() => (invoices ? todaysThree(invoices) : []), [invoices])
  const queue = useMemo(() => {
    if (!invoices) return []
    return [...invoices].sort(
      (a, b) =>
        tierOrder[priorityTier(a)] - tierOrder[priorityTier(b)]
        || remaining(b) - remaining(a)
        || overdueDays(b) - overdueDays(a),
    )
  }, [invoices])
  const drawerInvoice = invoices?.find(item => item.id === drawerId) ?? null
  const actionInvoice = invoices?.find(item => item.id === actionTarget?.id) ?? null

  const kpis = useMemo(() => {
    if (!invoices) {
      return { openRemaining: 0, todayCount: 0, broken: 0, disputed: 0 }
    }
    const active = invoices.filter(inActiveQueue)
    return {
      openRemaining: active
        .filter(item => disputeStatus(item) !== 'open')
        .reduce((sum, item) => sum + remaining(item), 0),
      todayCount: todaysThree(invoices).length,
      broken: active.filter(item => promiseStatus(item) === 'broken').length,
      disputed: active.filter(item => disputeStatus(item) === 'open').length,
    }
  }, [invoices])

  function openAction(invoiceId: string, kind: ActionKind) {
    setActionTarget({ id: invoiceId, kind })
  }

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice',
      key: 'invoice',
      render: (_value, row) => (
        <Space align="start" size={8}>
          <FileTextOutlined style={{ marginTop: 4, color: 'rgba(0,0,0,0.45)' }} />
          <span>
            <Text strong>{row.code}</Text>
            <br />
            <Text type="secondary">{row.customer}</Text>
          </span>
        </Space>
      ),
    },
    {
      title: 'Remaining',
      key: 'remaining',
      align: 'right',
      width: 110,
      render: (_value, row) => <Text>{money(remaining(row))}</Text>,
    },
    {
      title: 'Overdue',
      key: 'overdue',
      width: 88,
      render: (_value, row) => <Text>{`${overdueDays(row)}d`}</Text>,
    },
    {
      title: 'Priority',
      key: 'priority',
      width: 88,
      render: (_value, row) => <PriorityTag tier={priorityTier(row)} />,
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_value, row) => {
        const status = invoiceStatus(row)
        return <StatusTag kind={status.kind} label={status.label} />
      },
    },
    {
      title: 'Promise',
      key: 'promise',
      width: 96,
      render: (_value, row) => <Text>{invoicePromiseLabel(row)}</Text>,
    },
    {
      title: 'Dispute',
      key: 'dispute',
      width: 96,
      render: (_value, row) => <Text>{invoiceDisputeLabel(row)}</Text>,
    },
    {
      title: 'Invoice details',
      key: 'accuracy',
      width: 140,
      render: (_value, row) => <Text>{invoiceAccuracyLabel(row)}</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_value, row) => (
        <InvoiceRowMenu
          invoice={row}
          onAction={kind => openAction(row.id, kind)}
          onDetails={() => setDrawerId(row.id)}
        />
      ),
    },
  ]

  const pageTitle = nav === 'guide' ? 'Guide' : nav === 'queue' ? 'Queue' : 'Desk'

  return (
    <Layout style={{ minHeight: '100%' }}>
      <Sider width={220} className="desk-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="brand">
          <div className="brand-mark">CD</div>
          <div className="brand-name">Collections Desk</div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[nav]}
          onClick={({ key }) => setNav(key)}
          style={{ borderInlineEnd: 0, padding: '12px 8px' }}
          items={[
            { key: 'desk', icon: <DashboardOutlined />, label: 'Desk' },
            { key: 'queue', icon: <UnorderedListOutlined />, label: 'Queue' },
            { key: 'guide', icon: <BookOutlined />, label: 'Guide' },
          ]}
        />
        <div style={{ padding: '12px 16px' }}>
          <Text type="secondary">Demo {demoDay}</Text>
        </div>
      </Sider>

      <Layout>
        <Content className="desk-main">
          {error ? <Alert type="error" showIcon message={error} /> : null}
          {!invoices && !error ? (
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
              <Spin />
            </div>
          ) : null}

          {invoices ? (
            <>
              <div className="desk-title-row">
                <Title level={2} style={{ margin: 0 }}>{pageTitle}</Title>
                <Text type="secondary">
                  Payments {money(totalPayments(invoices))} · Follow-ups {totalFollowUps(invoices)} · {morningCapacity} slots
                </Text>
              </div>

              {nav === 'guide' ? (
                <Alert
                  type="info"
                  showIcon
                  message="Guide placeholder"
                  description="Reviewer walkthrough lands in a later ticket."
                />
              ) : (
                <>
                  <div className="kpi-row">
                    <div className="kpi-card">
                      <Text type="secondary" className="kpi-label">Open remaining</Text>
                      <div className="value accent">{money(kpis.openRemaining)}</div>
                    </div>
                    <div className="kpi-card">
                      <Text type="secondary" className="kpi-label">Next up</Text>
                      <div className="value">{kpis.todayCount}</div>
                    </div>
                    <div className="kpi-card">
                      <Text type="secondary" className="kpi-label">Broken promises</Text>
                      <div className="value warn">{kpis.broken}</div>
                    </div>
                    <div className="kpi-card">
                      <Text type="secondary" className="kpi-label">Disputed</Text>
                      <div className="value danger">{kpis.disputed}</div>
                    </div>
                  </div>

                  {nav === 'desk' ? (
                    <section className="section-block" aria-labelledby="next-up">
                      <Title level={4} id="next-up" style={{ marginTop: 0 }}>
                        <FlagOutlined style={{ marginRight: 8, color: '#2563EB' }} />
                        Next up
                      </Title>
                      {picks.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No morning follow-ups" />
                      ) : (
                        <div className="today-grid">
                          {picks.map(invoice => {
                            const { tier, reason } = explainPriority(invoice)
                            return (
                              <button
                                key={invoice.id}
                                type="button"
                                className="today-card"
                                onClick={() => {
                                  setExpandedRowKeys([invoice.id])
                                  setDrawerId(null)
                                }}
                              >
                                <span style={{ minWidth: 0, width: '100%' }}>
                                  <Space size={8} wrap>
                                    <FileTextOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
                                    <Text strong>{invoice.code}</Text>
                                    <PriorityTag tier={tier} />
                                  </Space>
                                  <div>
                                    <Text>{money(remaining(invoice))} remaining</Text>
                                  </div>
                                  <Text type="secondary">{reason}</Text>
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  ) : null}

                  <section className="queue-panel" aria-labelledby="queue-heading">
                    <div className="head">
                      <Title level={4} id="queue-heading" style={{ margin: 0 }}>
                        {nav === 'queue' ? 'All invoices' : 'Queue'}
                      </Title>
                    </div>
                    <Table
                      rowKey="id"
                      size="middle"
                      pagination={false}
                      dataSource={queue}
                      columns={columns}
                      scroll={{ x: 1100 }}
                      expandable={{
                        expandedRowKeys,
                        onExpandedRowsChange: keys => setExpandedRowKeys(keys as string[]),
                        expandedRowRender: record => (
                          <InvoiceDetailPanel
                            invoice={record}
                            onAction={kind => openAction(record.id, kind)}
                          />
                        ),
                      }}
                      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Queue empty" /> }}
                    />
                  </section>
                </>
              )}
            </>
          ) : null}
        </Content>
      </Layout>

      <Drawer
        title={drawerInvoice ? drawerInvoice.code : 'Invoice'}
        open={Boolean(drawerInvoice)}
        onClose={() => setDrawerId(null)}
        width={420}
        destroyOnClose
      >
        {drawerInvoice ? (
          <>
            <Text type="secondary">{drawerInvoice.customer}</Text>
            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <Space wrap>
                <PriorityTag tier={priorityTier(drawerInvoice)} />
                {(() => {
                  const status = invoiceStatus(drawerInvoice)
                  return <StatusTag kind={status.kind} label={status.label} />
                })()}
              </Space>
            </div>
            <InvoiceDetailPanel
              invoice={drawerInvoice}
              onAction={kind => openAction(drawerInvoice.id, kind)}
            />
          </>
        ) : null}
      </Drawer>

      {actionInvoice && actionTarget ? (
        <ActionModal
          invoice={actionInvoice}
          kind={actionTarget.kind}
          open
          onClose={() => setActionTarget(null)}
          onSaved={items => {
            setInvoices(items)
            message.success('Saved')
          }}
        />
      ) : null}
    </Layout>
  )
}
