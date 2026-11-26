import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Descriptions,
  Drawer,
  Empty,
  Layout,
  Menu,
  Spin,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AlertOutlined,
  BookOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  UnorderedListOutlined,
  WarningOutlined,
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
  type Invoice,
} from '@domain/index.ts'
import { loadInvoices } from '../../api/invoices.ts'
import { invoiceStatusLabel } from './status.ts'
import { PriorityTag, StatusTag } from './tags.tsx'

const { Sider, Content } = Layout
const { Text } = Typography

const tierOrder = { P0: 0, P1: 1, P2: 2, P3: 3 } as const

function money(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}


function pickIcon(invoice: Invoice) {
  const promise = promiseStatus(invoice)
  if (promise === 'broken') return { Icon: WarningOutlined, tone: 'warn' as const }
  if (disputeStatus(invoice) === 'open') return { Icon: AlertOutlined, tone: 'danger' as const }
  if (invoice.invoiceAccuracy === 'unverified_claim') return { Icon: FileSearchOutlined, tone: 'warn' as const }
  if (promise === 'active') return { Icon: ClockCircleOutlined, tone: 'default' as const }
  return { Icon: ExclamationCircleOutlined, tone: 'default' as const }
}

export default function DeskPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nav, setNav] = useState('desk')

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
  const selected = invoices?.find(item => item.id === selectedId) ?? null

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

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice',
      key: 'invoice',
      render: (_value, row) => (
        <>
          <div><Text strong>{row.code}</Text></div>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.customer}</Text>
        </>
      ),
    },
    {
      title: 'Remaining',
      key: 'remaining',
      align: 'right',
      width: 120,
      render: (_value, row) => money(remaining(row)),
    },
    {
      title: 'Overdue',
      key: 'overdue',
      width: 90,
      render: (_value, row) => `${overdueDays(row)}d`,
    },
    {
      title: 'Priority',
      key: 'priority',
      width: 80,
      render: (_value, row) => <PriorityTag tier={priorityTier(row)} />,
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_value, row) => <StatusTag label={invoiceStatusLabel(row)} />,
    },
  ]

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
        <div style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 12 }}>
          Demo {demoDay}
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
                <h1>{nav === 'guide' ? 'Guide' : nav === 'queue' ? 'Queue' : 'Desk'}</h1>
                <Text type="secondary">{morningCapacity} Follow-up slots</Text>
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
                      <div className="label">Open Remaining</div>
                      <div className="value accent">{money(kpis.openRemaining)}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="label">Next up</div>
                      <div className="value">{kpis.todayCount}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="label">Broken promises</div>
                      <div className="value warn">{kpis.broken}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="label">Disputed</div>
                      <div className="value danger">{kpis.disputed}</div>
                    </div>
                  </div>

                  {nav === 'desk' ? (
                    <section className="section-block" aria-labelledby="next-up">
                      <h2 id="next-up">Next up</h2>
                      {picks.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No morning follow-ups" />
                      ) : (
                        <div className="today-grid">
                          {picks.map(invoice => {
                            const { tier, reason } = explainPriority(invoice)
                            const { Icon, tone } = pickIcon(invoice)
                            return (
                              <button
                                key={invoice.id}
                                type="button"
                                className="today-card"
                                aria-current={selectedId === invoice.id}
                                onClick={() => setSelectedId(invoice.id)}
                              >
                                <span className={`today-icon${tone === 'default' ? '' : ` ${tone}`}`}>
                                  <Icon />
                                </span>
                                <span style={{ minWidth: 0 }}>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span className="code">{invoice.code}</span>
                                    <PriorityTag tier={tier} />
                                  </div>
                                  <div className="amt">{money(remaining(invoice))} Remaining</div>
                                  <div className="why">{reason}</div>
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  ) : null}

                  <section className="queue-panel" aria-labelledby="queue-heading">
                    <div className="head" id="queue-heading">
                      {nav === 'queue' ? 'All invoices' : 'Queue'}
                    </div>
                    <Table
                      rowKey="id"
                      size="middle"
                      pagination={false}
                      dataSource={queue}
                      columns={columns}
                      onRow={record => ({
                        onClick: () => setSelectedId(record.id),
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
        title={selected ? selected.code : 'Invoice'}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        width={420}
        destroyOnClose
      >
        {selected ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">{selected.customer}</Text>
            </div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <PriorityTag tier={priorityTier(selected)} />
              <StatusTag label={invoiceStatusLabel(selected)} />
            </div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
              {explainPriority(selected).reason}
            </Text>
            <Descriptions
              size="small"
              column={1}
              bordered
              items={[
                {
                  key: 'remaining',
                  label: 'Remaining',
                  children: `${money(remaining(selected))} / ${money(selected.amount)}`,
                },
                { key: 'promise', label: 'PromiseStatus', children: promiseStatus(selected) },
                { key: 'dispute', label: 'DisputeStatus', children: disputeStatus(selected) },
                { key: 'accuracy', label: 'InvoiceAccuracy', children: selected.invoiceAccuracy },
                { key: 'owner', label: 'OwnerRole', children: selected.ownerRole },
                { key: 'am', label: 'Account manager', children: selected.accountManager },
                { key: 'overdue', label: 'Overdue', children: `${overdueDays(selected)} days` },
                {
                  key: 'followups',
                  label: 'Follow-ups',
                  children: selected.followUps.length === 0 ? 'None' : String(selected.followUps.length),
                },
              ]}
            />
          </>
        ) : null}
      </Drawer>
    </Layout>
  )
}
