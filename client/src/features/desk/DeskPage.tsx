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
  FlagOutlined,
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
import ActionModal from './ActionModal.tsx'
import { InvoiceActionButtons, InvoiceRowMenu } from './InvoiceActions.tsx'
import {
  detailsStateValue,
  disputeStateValue,
  ownerLabel,
  primaryStatusLine,
  promiseStateValue,
} from './labels.ts'
import {
  glanceDetails,
  glanceDispute,
  glancePriority,
  glancePromise,
  glanceStatus,
  priorityRowClass,
} from './tableGlance.ts'
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

function paidAmount(invoice: Invoice) {
  return invoice.amount - remaining(invoice)
}

function InvoiceIdentity({ code, customer }: { code: string; customer: string }) {
  return (
    <div className="invoice-identity">
      <span className="invoice-code">{code}</span>
      <span className="invoice-customer">{customer}</span>
    </div>
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
  const followUpCount = invoice.followUps.length
  return (
    <div className="drawer-detail">
      <Text className="drawer-status-line">{primaryStatusLine(invoice)}</Text>

      <div className="drawer-amount-block">
        <Text type="secondary" className="drawer-field-label">Paid</Text>
        <div className="drawer-paid-amount">
          {money(paidAmount(invoice))} of {money(invoice.amount)}
        </div>
      </div>

      <div className="drawer-due-block">
        <Text type="secondary" className="drawer-field-label">Due</Text>
        <div>{formatDueDate(invoice)}</div>
      </div>

      <div className="drawer-state-block">
        <Text type="secondary" className="drawer-field-label">State</Text>
        <Descriptions
          size="small"
          column={1}
          className="drawer-state-desc"
          items={[
            { key: 'promise', label: 'Promise', children: promiseStateValue(invoice) },
            { key: 'dispute', label: 'Dispute', children: disputeStateValue(invoice) },
            { key: 'details', label: 'Details', children: detailsStateValue(invoice) },
          ]}
        />
      </div>

      <Text type="secondary" className="drawer-meta">
        {ownerLabel(invoice.ownerRole)}
        {' · '}
        {invoice.accountManager}
        {' · '}
        {followUpCount === 0
          ? 'No follow-ups'
          : `${followUpCount} follow-up${followUpCount === 1 ? '' : 's'}`}
      </Text>

      <Title level={5} style={{ marginTop: 20, marginBottom: 8 }}>Actions</Title>
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

  function applyDeskUpdate(next: Invoice[]) {
    // Replace session snapshot so Next up + queue re-sort by priority tiers.
    setInvoices(next)
  }

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice',
      key: 'invoice',
      render: (_value, row) => <InvoiceIdentity code={row.code} customer={row.customer} />,
    },
    {
      title: 'Remaining',
      key: 'remaining',
      align: 'right',
      width: 100,
      render: (_value, row) => <Text>{money(remaining(row))}</Text>,
    },
    {
      title: 'Due',
      key: 'due',
      width: 150,
      render: (_value, row) => <Text>{formatDueDate(row)}</Text>,
    },
    {
      title: 'Priority',
      key: 'priority',
      width: 64,
      render: (_value, row) => <Text>{glancePriority(priorityTier(row))}</Text>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_value, row) => <Text>{glanceStatus(row)}</Text>,
    },
    {
      title: 'Promise',
      key: 'promise',
      width: 72,
      render: (_value, row) => <Text>{glancePromise(row)}</Text>,
    },
    {
      title: 'Dispute',
      key: 'dispute',
      width: 72,
      render: (_value, row) => <Text>{glanceDispute(row)}</Text>,
    },
    {
      title: 'Details',
      key: 'details',
      width: 92,
      render: (_value, row) => <Text>{glanceDetails(row)}</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 108,
      fixed: 'right',
      render: (_value, row) => (
        <InvoiceRowMenu
          invoice={row}
          onAction={kind => openAction(row.id, kind)}
        />
      ),
    },
  ]

  const pageTitle = nav === 'guide' ? 'Guide' : 'Desk'

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
                                  <Text strong className="invoice-code">{invoice.code}</Text>
                                  <Text type="secondary">{glancePriority(tier)}</Text>
                                </Space>
                                <div className="invoice-customer" style={{ marginTop: 2 }}>
                                  {invoice.customer}
                                </div>
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

                  <section className="queue-panel" aria-labelledby="queue-heading">
                    <div className="head">
                      <Title level={4} id="queue-heading" style={{ margin: 0 }}>
                        Queue
                      </Title>
                    </div>
                    <Table
                      rowKey="id"
                      size="small"
                      pagination={false}
                      dataSource={queue}
                      columns={columns}
                      scroll={{ x: 1000 }}
                      rowClassName={record => priorityRowClass(record)}
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
            applyDeskUpdate(items)
            message.success('Saved')
          }}
        />
      ) : null}
    </Layout>
  )
}
