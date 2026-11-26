import { useEffect, useState } from 'react'
import { Alert, Descriptions, Empty, Layout, Spin, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  demoDay,
  disputeStatus,
  explainPriority,
  morningCapacity,
  overdueDays,
  priorityTier,
  promiseStatus,
  remaining,
  todaysThree,
  type Invoice,
  type PriorityTier,
} from '@domain/index.ts'
import { loadInvoices } from '../../api/invoices.ts'

const { Header, Content } = Layout
const { Text, Title } = Typography

const tierOrder = { P0: 0, P1: 1, P2: 2, P3: 3 } as const

function money(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function tierColor(tier: PriorityTier) {
  switch (tier) {
    case 'P0':
      return 'warning'
    case 'P1':
      return 'processing'
    case 'P2':
      return 'default'
    case 'P3':
      return 'success'
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}

function TierTag({ tier }: { tier: PriorityTier }) {
  return <Tag color={tierColor(tier)} style={{ marginInlineEnd: 0, borderRadius: 2 }}>{tier}</Tag>
}

function sortQueue(invoices: Invoice[]) {
  return [...invoices].sort(
    (a, b) =>
      tierOrder[priorityTier(a)] - tierOrder[priorityTier(b)]
      || remaining(b) - remaining(a)
      || overdueDays(b) - overdueDays(a),
  )
}

export default function DeskPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadInvoices()
      .then(items => {
        if (!alive) return
        setInvoices(items)
        setSelectedId(todaysThree(items)[0]?.id ?? items[0]?.id ?? null)
      })
      .catch(() => {
        if (alive) setError('Could not load invoices.')
      })
    return () => {
      alive = false
    }
  }, [])

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content className="desk-shell">
          <Alert type="error" showIcon message={error} />
        </Content>
      </Layout>
    )
  }

  if (!invoices) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
          <Spin />
        </Content>
      </Layout>
    )
  }

  const picks = todaysThree(invoices)
  const queue = sortQueue(invoices)
  const selected = invoices.find(item => item.id === selectedId) ?? null

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
      width: 110,
      render: (_value, row) => money(remaining(row)),
    },
    {
      title: 'Overdue',
      key: 'overdue',
      width: 80,
      render: (_value, row) => `${overdueDays(row)}d`,
    },
    {
      title: 'Tier',
      key: 'tier',
      width: 64,
      render: (_value, row) => <TierTag tier={priorityTier(row)} />,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="desk-header">
        <Title level={4} style={{ margin: 0, color: '#0B1F33' }}>Collections Desk</Title>
        <Text type="secondary">{demoDay} · {morningCapacity} Follow-up slots</Text>
      </Header>

      <Content className="desk-shell">
        <section className="desk-section" aria-labelledby="todays-3">
          <div className="desk-section-head">
            <h2 id="todays-3">Today’s 3</h2>
            <Text type="secondary">{picks.length}/{morningCapacity}</Text>
          </div>
          {picks.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No morning follow-ups" />
          ) : (
            <div className="pick-grid">
              {picks.map(invoice => {
                const { tier, reason } = explainPriority(invoice)
                return (
                  <button
                    key={invoice.id}
                    type="button"
                    className="pick-item"
                    aria-current={selectedId === invoice.id}
                    onClick={() => setSelectedId(invoice.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span className="code">{invoice.code}</span>
                      <TierTag tier={tier} />
                    </div>
                    <div className="amt">{money(remaining(invoice))} Remaining</div>
                    <div className="why">{reason}</div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className="desk-split">
          <section className="desk-panel" aria-labelledby="queue">
            <div className="desk-panel-head" id="queue">Queue</div>
            <div className="desk-panel-body">
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                showHeader
                dataSource={queue}
                columns={columns}
                onRow={record => ({
                  onClick: () => setSelectedId(record.id),
                  style: {
                    cursor: 'pointer',
                    background: record.id === selectedId ? '#EEF2F6' : undefined,
                  },
                })}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Queue empty" /> }}
              />
            </div>
          </section>

          <section className="desk-panel" aria-labelledby="detail">
            <div className="desk-panel-head" id="detail">
              {selected ? selected.code : 'Invoice'}
              {selected ? <span style={{ float: 'right' }}><TierTag tier={priorityTier(selected)} /></span> : null}
            </div>
            <div className="desk-detail">
              {selected ? (
                <>
                  <Text type="secondary">{selected.customer}</Text>
                  <div style={{ margin: '12px 0', color: '#64748B', fontSize: 13 }}>
                    {explainPriority(selected).reason}
                  </div>
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
                      {
                        key: 'promise',
                        label: 'PromiseStatus',
                        children: promiseStatus(selected),
                      },
                      {
                        key: 'dispute',
                        label: 'DisputeStatus',
                        children: disputeStatus(selected),
                      },
                      {
                        key: 'accuracy',
                        label: 'InvoiceAccuracy',
                        children: selected.invoiceAccuracy,
                      },
                      {
                        key: 'owner',
                        label: 'OwnerRole',
                        children: selected.ownerRole,
                      },
                      {
                        key: 'am',
                        label: 'Account manager',
                        children: selected.accountManager,
                      },
                      {
                        key: 'overdue',
                        label: 'Overdue',
                        children: `${overdueDays(selected)} days`,
                      },
                      {
                        key: 'followups',
                        label: 'Follow-ups',
                        children: selected.followUps.length === 0 ? 'None' : String(selected.followUps.length),
                      },
                    ]}
                  />
                </>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select an Invoice" />
              )}
            </div>
          </section>
        </div>
      </Content>
    </Layout>
  )
}
