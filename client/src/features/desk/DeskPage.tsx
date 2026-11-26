import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Empty,
  Layout,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'
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
const { Title, Text, Paragraph } = Typography

function money(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function tierColor(tier: PriorityTier): string {
  switch (tier) {
    case 'P0':
      return 'gold'
    case 'P1':
      return 'blue'
    case 'P2':
      return 'default'
    case 'P3':
      return 'green'
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}

function TierTag({ tier }: { tier: PriorityTier }) {
  return <Tag color={tierColor(tier)}>{tier}</Tag>
}

export default function DeskPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadInvoices()
      .then(items => {
        if (cancelled) return
        setInvoices(items)
        const picks = todaysThree(items)
        setSelectedId(picks[0]?.id ?? items[0]?.id ?? null)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const picks = useMemo(() => (invoices ? todaysThree(invoices) : []), [invoices])
  const queue = useMemo(() => {
    if (!invoices) return []
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 } as const
    return [...invoices].sort(
      (a, b) =>
        order[priorityTier(a)] - order[priorityTier(b)]
        || remaining(b) - remaining(a)
        || overdueDays(b) - overdueDays(a),
    )
  }, [invoices])
  const selected = invoices?.find(item => item.id === selectedId) ?? null

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice',
      dataIndex: 'code',
      key: 'code',
      render: (code: string, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{code}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.customer}</Text>
        </Space>
      ),
    },
    {
      title: 'Remaining',
      key: 'remaining',
      align: 'right',
      render: (_: unknown, row) => money(remaining(row)),
    },
    {
      title: 'Overdue',
      key: 'overdue',
      render: (_: unknown, row) => `${overdueDays(row)}d`,
    },
    {
      title: 'Tier',
      key: 'tier',
      render: (_: unknown, row) => <TierTag tier={priorityTier(row)} />,
    },
  ]

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 48, maxWidth: 960, margin: '0 auto' }}>
          <Alert type="error" showIcon message={error} />
        </Content>
      </Layout>
    )
  }

  if (!invoices) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
          <Spin size="large" tip="Loading morning desk…" />
        </Content>
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          borderBottom: '1px solid #c5d0c9',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <Text type="secondary" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block' }}>
            Finance operations
          </Text>
          <Title level={3} style={{ margin: 0, color: '#14231c' }}>
            Invoice Collections Desk
          </Title>
        </div>
        <Text type="secondary">
          Demo day {demoDay} · Morning capacity {morningCapacity}
        </Text>
      </Header>

      <Content style={{ padding: '24px 24px 48px', maxWidth: 1180, width: '100%', margin: '0 auto' }}>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Card
            title={
              <Space direction="vertical" size={0}>
                <Text type="secondary" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  This morning
                </Text>
                <span>Today’s {morningCapacity}</span>
              </Space>
            }
            extra={
              <Text strong style={{ color: '#1f5c45' }}>
                {picks.length} of {morningCapacity} slots
              </Text>
            }
          >
            <Paragraph type="secondary" style={{ marginTop: 0 }}>
              Explainable priority tiers — not scores. Work these follow-ups first.
            </Paragraph>
            {picks.length === 0 ? (
              <Empty description="No morning follow-ups. Queue is clear or waiting." />
            ) : (
              <Row gutter={[16, 16]}>
                {picks.map(invoice => {
                  const explanation = explainPriority(invoice)
                  const active = selectedId === invoice.id
                  return (
                    <Col xs={24} md={8} key={invoice.id}>
                      <Card
                        size="small"
                        hoverable
                        onClick={() => setSelectedId(invoice.id)}
                        styles={{
                          body: {
                            cursor: 'pointer',
                            border: active ? '1px solid #1f5c45' : '1px solid transparent',
                            background: active ? '#f3f8f5' : undefined,
                          },
                        }}
                        aria-current={active ? 'true' : undefined}
                      >
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Title level={4} style={{ margin: 0 }}>{invoice.code}</Title>
                          <TierTag tier={explanation.tier} />
                        </Space>
                        <Text strong style={{ display: 'block', marginTop: 8 }}>
                          {money(remaining(invoice))} remaining
                        </Text>
                        <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
                          {explanation.reason}
                        </Paragraph>
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            )}
          </Card>

          <Row gutter={[16, 16]} align="stretch">
            <Col xs={24} lg={10}>
              <Card title="Queue" extra={<Text type="secondary">Read-only in this slice</Text>}>
                <Table
                  rowKey="id"
                  size="middle"
                  pagination={false}
                  dataSource={queue}
                  columns={columns}
                  onRow={record => ({
                    onClick: () => setSelectedId(record.id),
                    style: {
                      cursor: 'pointer',
                      background: record.id === selectedId ? '#f3f8f5' : undefined,
                    },
                  })}
                  locale={{ emptyText: <Empty description="No invoices in queue" /> }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card
                title={selected ? `Invoice ${selected.code}` : 'Invoice detail'}
                extra={selected ? <TierTag tier={priorityTier(selected)} /> : null}
              >
                {selected ? (
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div>
                      <Title level={3} style={{ margin: 0 }}>{selected.code}</Title>
                      <Text type="secondary">{selected.customer}</Text>
                    </div>
                    <Alert
                      type="info"
                      showIcon
                      message={explainPriority(selected).reason}
                      style={{ background: '#f3f8f5', borderColor: '#c5d0c9' }}
                    />
                    <Descriptions
                      bordered
                      size="small"
                      column={{ xs: 1, sm: 2 }}
                      items={[
                        {
                          key: 'remaining',
                          label: 'Remaining',
                          children: `${money(remaining(selected))} of ${money(selected.amount)}`,
                        },
                        {
                          key: 'overdue',
                          label: 'Overdue',
                          children: `${overdueDays(selected)} days`,
                        },
                        {
                          key: 'promise',
                          label: 'Promise',
                          children: promiseStatus(selected),
                        },
                        {
                          key: 'dispute',
                          label: 'Dispute',
                          children: disputeStatus(selected),
                        },
                        {
                          key: 'accuracy',
                          label: 'Invoice accuracy',
                          children: selected.invoiceAccuracy,
                        },
                        {
                          key: 'am',
                          label: 'Account manager',
                          children: selected.accountManager,
                        },
                        {
                          key: 'followups',
                          label: 'Follow-ups',
                          span: 2,
                          children: selected.followUps.length === 0
                            ? 'None recorded'
                            : `${selected.followUps.length} on file`,
                        },
                      ]}
                    />
                    <Alert
                      type="warning"
                      showIcon
                      message="Actions (follow-up, promise, payment, resolve) land in later tickets. This slice is read-only."
                    />
                  </Space>
                ) : (
                  <Empty description="Select an invoice from Today’s 3 or the queue." />
                )}
              </Card>
            </Col>
          </Row>
        </Space>
      </Content>
    </Layout>
  )
}
