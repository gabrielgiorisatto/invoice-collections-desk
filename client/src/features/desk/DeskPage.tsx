import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  App,
  Descriptions,
  Drawer,
  Empty,
  Layout,
  Menu,
  Segmented,
  Space,
  Spin,
  Table,
  Timeline,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  BookOutlined,
  DashboardOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  FlagOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  activityTimeline,
  dateFilterLabels,
  demoDay,
  disputeStatus,
  explainPriority,
  filterByDueWindow,
  formatDueDate,
  morningCapacity,
  openRemainingTotal,
  overdueDays,
  paidTotal,
  priorityTier,
  promiseStatus,
  remaining,
  todaysThree,
  totalFollowUps,
  type DateFilterPreset,
  type Invoice,
} from '@domain/index.ts'
import { loadInvoices } from '../../api/invoices.ts'
import { invoiceStatus } from './status.ts'
import { PriorityTag, StatusTag } from './tags.tsx'
import ActionModal from './ActionModal.tsx'
import { InvoiceActionButtons, InvoiceRowMenu } from './InvoiceActions.tsx'
import {
  accuracyDetailValue,
  disputeDetailValue,
  ownerLabel,
  promiseDetailValue,
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

function DetailValue({
  text,
  bad,
}: {
  text: string
  bad?: 'error' | 'warning'
}) {
  const icon =
    bad === 'error' ? <ExclamationCircleOutlined style={{ color: '#cf1322', marginRight: 6 }} />
      : bad === 'warning' ? <WarningOutlined style={{ color: '#d48806', marginRight: 6 }} />
        : null
  return (
    <span>
      {icon}
      <Text>{text}</Text>
    </span>
  )
}

function ActivitySection({ invoice }: { invoice: Invoice }) {
  const items = activityTimeline(invoice)
  return (
    <div style={{ marginTop: 16 }}>
      <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Activity</Title>
      {items.length === 0 ? (
        <Text type="secondary">No recorded actions yet.</Text>
      ) : (
        <Timeline
          items={items.map(entry => ({
            key: entry.id,
            children: (
              <div>
                <Text type="secondary">{entry.at.slice(0, 10)}</Text>
                <div>
                  <Text strong>{entry.title}</Text>
                </div>
                {entry.detail ? <Text type="secondary">{entry.detail}</Text> : null}
              </div>
            ),
          }))}
        />
      )}
    </div>
  )
}

function InvoiceDetailPanel({
  invoice,
  onAction,
}: {
  invoice: Invoice
  onAction: (kind: ActionKind) => void
}) {
  const promise = promiseStatus(invoice)
  const dispute = disputeStatus(invoice)
  return (
    <div className="row-expand">
      <Text type="secondary">{explainPriority(invoice).reason}</Text>
      <Descriptions
        size="small"
        column={1}
        style={{ marginTop: 12, marginBottom: 16 }}
        items={[
          {
            key: 'remaining',
            label: 'Remaining',
            children: `${money(remaining(invoice))} of ${money(invoice.amount)}`,
          },
          {
            key: 'due',
            label: 'Due',
            children: formatDueDate(invoice),
          },
          {
            key: 'promise',
            label: 'Promise',
            children: (
              <DetailValue
                text={promiseDetailValue(invoice)}
                bad={promise === 'broken' ? 'error' : undefined}
              />
            ),
          },
          {
            key: 'dispute',
            label: 'Dispute',
            children: (
              <DetailValue
                text={disputeDetailValue(invoice)}
                bad={dispute === 'open' ? 'error' : undefined}
              />
            ),
          },
          {
            key: 'accuracy',
            label: 'Invoice details',
            children: (
              <DetailValue
                text={accuracyDetailValue(invoice)}
                bad={invoice.invoiceAccuracy === 'unverified_claim' ? 'warning' : undefined}
              />
            ),
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
      <ActivitySection invoice={invoice} />
    </div>
  )
}

export default function DeskPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nav, setNav] = useState('desk')
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('all-time')
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

  const filtered = useMemo(
    () => (invoices ? filterByDueWindow(invoices, dateFilter) : []),
    [invoices, dateFilter],
  )
  const picks = useMemo(() => todaysThree(filtered), [filtered])
  const queue = useMemo(() => {
    return [...filtered].sort(
      (a, b) =>
        tierOrder[priorityTier(a)] - tierOrder[priorityTier(b)]
        || remaining(b) - remaining(a)
        || overdueDays(b) - overdueDays(a),
    )
  }, [filtered])
  const drawerInvoice = invoices?.find(item => item.id === drawerId) ?? null
  const actionInvoice = invoices?.find(item => item.id === actionTarget?.id) ?? null

  const kpis = useMemo(() => {
    return {
      openRemaining: openRemainingTotal(filtered),
      paid: paidTotal(filtered),
      broken: filtered.filter(item => promiseStatus(item) === 'broken').length,
      disputed: filtered.filter(item => disputeStatus(item) === 'open').length,
    }
  }, [filtered])

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
      title: 'Due',
      key: 'due',
      width: 180,
      render: (_value, row) => <Text>{formatDueDate(row)}</Text>,
    },
    {
      title: 'Priority',
      key: 'priority',
      width: 72,
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
      title: '',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_value, row) => (
        <InvoiceRowMenu
          invoice={row}
          onAction={kind => openAction(row.id, kind)}
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
                  Follow-ups {totalFollowUps(filtered)} · {morningCapacity} slots · Due window vs {demoDay}
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
                  <div className="filter-row">
                    <Segmented
                      value={dateFilter}
                      onChange={value => setDateFilter(value as DateFilterPreset)}
                      options={[
                        { label: dateFilterLabels['last-day'], value: 'last-day' },
                        { label: dateFilterLabels['last-7-days'], value: 'last-7-days' },
                        { label: dateFilterLabels['this-month'], value: 'this-month' },
                        { label: dateFilterLabels['this-year'], value: 'this-year' },
                        { label: dateFilterLabels['all-time'], value: 'all-time' },
                      ]}
                    />
                  </div>
                  <div className="kpi-row">
                    <div className="kpi-card">
                      <Text type="secondary" className="kpi-label">Open remaining</Text>
                      <div className="value accent">{money(kpis.openRemaining)}</div>
                    </div>
                    <div className="kpi-card">
                      <Text type="secondary" className="kpi-label">Paid total</Text>
                      <div className="value">{money(kpis.paid)}</div>
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
                                onClick={() => setDrawerId(invoice.id)}
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
                      scroll={{ x: 900 }}
                      onRow={record => ({
                        onClick: () => setDrawerId(record.id),
                        style: { cursor: 'pointer' },
                      })}
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
        width={440}
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
