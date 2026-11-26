import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
  Alert,
  App,
  Button,
  Drawer,
  Empty,
  Layout,
  Menu,
  Segmented,
  Select,
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
  DollarOutlined,
  FileTextOutlined,
  FlagOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  activityTimeline,
  compareQueueColumn,
  dateFilterLabels,
  demoDay,
  describeQueueFilters,
  deskEmptyCopy,
  deskQueueView,
  disputeStatus,
  emptyQueueFilters,
  explainPriority,
  filterByDueWindow,
  openRemainingTotal,
  overdueDays,
  paidTotal,
  priorityTier,
  promiseStatus,
  queueFiltersActive,
  queuePriorityFacetLabels,
  queuePromiseFacetLabels,
  queueStatusFacetLabels,
  remaining,
  todaysThree,
  type DateFilterPreset,
  type Invoice,
  type PriorityTier,
  type QueueFilters,
  type QueuePriorityFacet,
  type QueuePromiseFacet,
  type QueueStatusFacet,
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
  glanceDetailsTone,
  glanceDispute,
  glanceDisputeTone,
  glancePriority,
  glancePromise,
  glancePromiseTone,
  glanceStatus,
  glanceStatusTone,
  priorityRowClass,
  priorityToneClass,
  type GlanceTone,
} from './tableGlance.ts'
import type { ActionKind } from './primaryAction.ts'

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

function paidAmount(invoice: Invoice) {
  return invoice.amount - remaining(invoice)
}

function InvoiceIdentity({ code, customer }: { code: string; customer: string }) {
  return (
    <div className="invoice-identity">
      <span className="invoice-customer-name">{customer}</span>
      <span className="invoice-code-muted">{code}</span>
    </div>
  )
}

function GlancePill({ label, tone }: { label: string; tone: GlanceTone }) {
  if (label === '—') return <span className="cell-dash">—</span>
  return <span className={`pill tone-${tone}`}>{label}</span>
}

function PriorityPill({ tier }: { tier: PriorityTier }) {
  return <span className={`pill ${priorityToneClass(tier)}`}>{glancePriority(tier)}</span>
}

function DueCell({ invoice }: { invoice: Invoice }) {
  const days = overdueDays(invoice)
  return (
    <div className="due-cell">
      <span className="due-date">{invoice.dueDate}</span>
      {days > 0 ? <span className="due-age">({days}d overdue)</span> : null}
    </div>
  )
}

function StateChip({ label, value, tone }: { label: string; value: string; tone: GlanceTone }) {
  return <span className={`pill tone-${tone}`}>{label}: {value}</span>
}

function ActivitySection({ invoice }: { invoice: Invoice }) {
  const items = activityTimeline(invoice)
  return (
    <div className="activity-block">
      <h3 className="drawer-section">Activity</h3>
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
  const days = overdueDays(invoice)
  return (
    <div className="drawer-detail">
      <p className="drawer-customer">{invoice.customer}</p>
      <p className="drawer-status-line">{primaryStatusLine(invoice)}</p>

      <div className="drawer-figures">
        <div>
          <div className="drawer-kicker">Paid</div>
          <div className="drawer-paid">
            <span className="drawer-paid-main">{money(paidAmount(invoice))}</span>
            <span className="drawer-paid-of">of {money(invoice.amount)}</span>
          </div>
        </div>
        <div>
          <div className="drawer-kicker">Due</div>
          <div className="drawer-due-date">{invoice.dueDate}</div>
          {days > 0 ? <div className="drawer-due-age">({days}d overdue)</div> : null}
        </div>
      </div>

      <div className="drawer-kicker">State</div>
      <div className="state-chips">
        <StateChip label="Promise" value={promiseStateValue(invoice)} tone={glancePromiseTone(invoice)} />
        <StateChip label="Dispute" value={disputeStateValue(invoice)} tone={glanceDisputeTone(invoice)} />
        <StateChip label="Details" value={detailsStateValue(invoice)} tone={glanceDetailsTone(invoice)} />
      </div>

      <p className="drawer-meta">
        {ownerLabel(invoice.ownerRole)}
        {': '}
        {invoice.accountManager}
        {' · '}
        {followUpCount === 0
          ? 'No follow-ups'
          : `${followUpCount} follow-up${followUpCount === 1 ? '' : 's'}`}
      </p>

      <h3 className="drawer-section">Actions</h3>
      <InvoiceActionButtons invoice={invoice} onAction={onAction} />
      <ActivitySection invoice={invoice} />
    </div>
  )
}

function GuidePage() {
  return (
    <article className="guide-page">
      <section>
        <h2>Next up</h2>
        <p>
          The three cards are this morning’s follow-ups. Open one to see the invoice.
          The line under the amount says why it is here.
        </p>
        <p>
          Recording a payment, or resolving without payment, does not use up a slot.
          When a High invoice leaves the queue, the next one moves into the three.
          A promise that is still in the future stays off this list while High work remains.
        </p>
      </section>

      <section>
        <h2>Priority colors</h2>
        <p>
          The row wash is the priority. The tag is the same fact, easier to read in a column.
          These are tiers, not a score and not a prediction of who will pay.
        </p>
        <ul className="guide-swatches">
          <li><span className="pill prio-p0">High</span> Soft red row. Broken promise, never contacted, or details not checked.</li>
          <li><span className="pill prio-p1">Med</span> Soft amber row. Open dispute, or follow-ups nobody answered.</li>
          <li><span className="pill prio-p2">Low</span> Soft blue row. Promise on file, not due yet. Wait.</li>
          <li><span className="pill prio-p3">Clear</span> Soft green row. Nothing left to chase.</li>
        </ul>
        <p>
          Other tags: <span className="pill tone-attention">Broken</span> and needs-check are orange.
          <span className="pill tone-caution">Disputed</span> is red.
          <span className="pill tone-wait">Open</span> and verified are blue.
          A dash means nothing is recorded there.
        </p>
      </section>

      <section>
        <h2>Actions</h2>
        <p>
          The drawer lists every action in the same order. The blue button is the one that fits this invoice.
          The others stay visible. The line under a gray button says why it is off.
        </p>
        <ul>
          <li><strong>Record follow-up</strong> is a contact note. It is not payment, and it does not verify the invoice.</li>
          <li><strong>Record payment</strong> is the only action that counts cash. Part of the balance is allowed.</li>
          <li><strong>Record promise</strong> saves a date. A future date waits. A past unpaid date is broken.</li>
          <li><strong>Resolve without payment</strong> leaves the queue and does not count as cash.</li>
          <li><strong>Route to AM</strong> is a labeled simulation. It does not message a real account manager.</li>
        </ul>
      </section>

      <section>
        <h2>Filters and sort</h2>
        <p>
          Due window, above the totals, limits Next up, the totals, and the queue together.
          Status, Promise, and Priority narrow only the table. Click a column title to sort.
          If the table is empty, it says whether the window matched nothing or the queue is cleared, and offers a way back.
        </p>
      </section>

      <section>
        <h2>Refresh</h2>
        <p>
          This browser keeps the desk. Refresh and the same notes, promises, and payments are still there.
          Another browser starts from the six sample invoices. If the server file is wiped, this browser starts over too.
        </p>
      </section>

      <section>
        <h2>The six invoices</h2>
        <p>Dates are relative to the demo day on the sidebar, 2026-11-26. The customers are fictional.</p>
        <ul>
          <li><strong>Dune</strong> promised to pay and the date passed. Follow up.</li>
          <li><strong>Brook</strong> has never been contacted. Make the first call.</li>
          <li><strong>Grove</strong> says the invoice details are wrong. Check them before chasing.</li>
          <li><strong>Crest</strong> promised a date that has not arrived. Wait.</li>
          <li><strong>Aster</strong> disputes the quantity. Do not treat it as a cold chase.</li>
          <li><strong>East</strong> did not answer two follow-ups. It stays Med until no High work is left. Routing to the account manager is for an open dispute, which is Aster, not East.</li>
        </ul>
      </section>
    </article>
  )
}

export default function DeskPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nav, setNav] = useState('desk')
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('all-time')
  const [queueFilters, setQueueFilters] = useState<QueueFilters>(emptyQueueFilters)
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
  const queueView = useMemo(
    () => (invoices ? deskQueueView(invoices, filtered, dateFilter, queueFilters) : null),
    [invoices, filtered, dateFilter, queueFilters],
  )
  const picks = useMemo(() => todaysThree(filtered), [filtered])
  const queue = useMemo(() => {
    const active = queueView?.kind === 'ready' ? queueView.active : []
    // Default order until the operator clicks a column sorter.
    return [...active].sort(
      (a, b) =>
        tierOrder[priorityTier(a)] - tierOrder[priorityTier(b)]
        || remaining(b) - remaining(a)
        || overdueDays(b) - overdueDays(a),
    )
  }, [queueView])
  const drawerInvoice = invoices?.find(item => item.id === drawerId) ?? null
  const actionInvoice = invoices?.find(item => item.id === actionTarget?.id) ?? null
  const emptyCopy = queueView && queueView.kind !== 'ready' ? deskEmptyCopy(queueView) : null
  const activeFacetLabels = describeQueueFilters(queueFilters)
  const facetsOn = queueFiltersActive(queueFilters)

  function clearQueueFilters() {
    setQueueFilters(emptyQueueFilters)
  }

  function handleEmptyAction() {
    if (!emptyCopy?.action) return
    if (emptyCopy.action === 'clear-filters') clearQueueFilters()
    else setDateFilter('all-time')
  }

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
      title: 'Customer / Invoice',
      key: 'invoice',
      sorter: (a, b) => compareQueueColumn(a, b, 'invoice'),
      render: (_value, row) => <InvoiceIdentity code={row.code} customer={row.customer} />,
    },
    {
      title: 'Remaining',
      key: 'remaining',
      align: 'right',
      width: 110,
      sorter: (a, b) => compareQueueColumn(a, b, 'remaining'),
      render: (_value, row) => <span className="cell-money">{money(remaining(row))}</span>,
    },
    {
      title: 'Due',
      key: 'due',
      width: 148,
      sorter: (a, b) => compareQueueColumn(a, b, 'due'),
      render: (_value, row) => <DueCell invoice={row} />,
    },
    {
      title: 'Priority',
      key: 'priority',
      width: 96,
      sorter: (a, b) => compareQueueColumn(a, b, 'priority'),
      render: (_value, row) => <PriorityPill tier={priorityTier(row)} />,
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      sorter: (a, b) => compareQueueColumn(a, b, 'status'),
      render: (_value, row) => <GlancePill label={glanceStatus(row)} tone={glanceStatusTone(row)} />,
    },
    {
      title: 'Promise',
      key: 'promise',
      width: 100,
      sorter: (a, b) => compareQueueColumn(a, b, 'promise'),
      render: (_value, row) => <GlancePill label={glancePromise(row)} tone={glancePromiseTone(row)} />,
    },
    {
      title: 'Dispute',
      key: 'dispute',
      width: 100,
      sorter: (a, b) => compareQueueColumn(a, b, 'dispute'),
      render: (_value, row) => <GlancePill label={glanceDispute(row)} tone={glanceDisputeTone(row)} />,
    },
    {
      title: 'Details',
      key: 'details',
      width: 120,
      sorter: (a, b) => compareQueueColumn(a, b, 'details'),
      render: (_value, row) => <GlancePill label={glanceDetails(row)} tone={glanceDetailsTone(row)} />,
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

  const onGuide = nav === 'guide'

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
        <div className="sider-foot">Demo {demoDay}</div>
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
              <header className="desk-title-block">
                <h1 className="page-title">{onGuide ? 'Guide' : 'Desk'}</h1>
                <p className="page-subtitle">
                  {onGuide
                    ? 'How to use the desk.'
                    : 'Collections operations desk for invoice follow-ups.'}
                </p>
              </header>

              {onGuide ? (
                <GuidePage />
              ) : (
                <>
                  <div className="filter-row">
                    <label className="filter-label" id="due-window-label" htmlFor="due-window-filter">
                      Due window
                    </label>
                    <Segmented
                      id="due-window-filter"
                      aria-labelledby="due-window-label"
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
                      <div className="kpi-label">
                        <DollarOutlined className="kpi-icon accent" aria-hidden />
                        Open remaining
                      </div>
                      <div className="value accent">{money(kpis.openRemaining)}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">
                        <FileTextOutlined className="kpi-icon muted" aria-hidden />
                        Paid total
                      </div>
                      <div className="value">{money(kpis.paid)}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">
                        <WarningOutlined className="kpi-icon warn" aria-hidden />
                        Broken promises
                      </div>
                      <div className="value warn">{kpis.broken}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">
                        <FlagOutlined className="kpi-icon danger" aria-hidden />
                        Disputed
                      </div>
                      <div className="value danger">{kpis.disputed}</div>
                    </div>
                  </div>

                  <section className="section-block" aria-labelledby="next-up">
                    <h2 className="section-label" id="next-up">
                      <FlagOutlined className="section-icon accent" aria-hidden />
                      Next up
                    </h2>
                    {picks.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          queueView?.kind === 'all-cleared'
                            ? 'No morning follow-ups — queue cleared'
                            : queueView?.kind === 'filter-no-match'
                              ? 'No morning follow-ups in this due window'
                              : 'No morning follow-ups'
                        }
                      />
                    ) : (
                      <div className="today-grid">
                        {picks.map(invoice => {
                          const { tier, reason } = explainPriority(invoice)
                          return (
                            <button
                              key={invoice.id}
                              type="button"
                              className={drawerId === invoice.id ? 'today-card is-open' : 'today-card'}
                              aria-current={drawerId === invoice.id ? 'true' : undefined}
                              aria-label={`Open ${invoice.code}, ${invoice.customer}`}
                              onClick={() => setDrawerId(invoice.id)}
                            >
                              <span className="today-card-body">
                                <span className="today-card-top">
                                  <span className="today-company">{invoice.customer}</span>
                                  <PriorityPill tier={tier} />
                                </span>
                                <span className="today-amount">{money(remaining(invoice))} remaining</span>
                                <span className="today-reason">{reason}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  <section className="queue-panel" aria-labelledby="queue-heading">
                    <div className="head">
                      <h2 className="section-label" id="queue-heading">
                        <UnorderedListOutlined className="section-icon" aria-hidden />
                        Queue
                      </h2>
                    </div>
                    <div className="queue-filter-bar" role="group" aria-label="Queue filters">
                      <label className="filter-label" htmlFor="queue-filter-status">Status</label>
                      <Select
                        id="queue-filter-status"
                        aria-label="Filter by status"
                        allowClear
                        placeholder="All"
                        style={{ minWidth: 140 }}
                        value={queueFilters.status ?? undefined}
                        onChange={value => setQueueFilters(current => ({
                          ...current,
                          status: (value as QueueStatusFacet | undefined) ?? null,
                        }))}
                        options={Object.entries(queueStatusFacetLabels).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                      />
                      <label className="filter-label" htmlFor="queue-filter-promise">Promise</label>
                      <Select
                        id="queue-filter-promise"
                        aria-label="Filter by promise"
                        allowClear
                        placeholder="All"
                        style={{ minWidth: 140 }}
                        value={queueFilters.promise ?? undefined}
                        onChange={value => setQueueFilters(current => ({
                          ...current,
                          promise: (value as QueuePromiseFacet | undefined) ?? null,
                        }))}
                        options={Object.entries(queuePromiseFacetLabels).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                      />
                      <label className="filter-label" htmlFor="queue-filter-priority">Priority</label>
                      <Select
                        id="queue-filter-priority"
                        aria-label="Filter by priority"
                        allowClear
                        placeholder="All"
                        style={{ minWidth: 120 }}
                        value={queueFilters.priority ?? undefined}
                        onChange={value => setQueueFilters(current => ({
                          ...current,
                          priority: (value as QueuePriorityFacet | undefined) ?? null,
                        }))}
                        options={Object.entries(queuePriorityFacetLabels).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                      />
                    </div>
                    {facetsOn ? (
                      <div className="queue-filter-summary" aria-live="polite">
                        <Text>
                          Filtering by{' '}
                          <Text strong>{activeFacetLabels.join(' · ')}</Text>
                        </Text>
                        <Button type="link" onClick={clearQueueFilters} aria-label="Clear queue filters">
                          Clear
                        </Button>
                      </div>
                    ) : null}
                    <Table
                      rowKey="id"
                      size="small"
                      pagination={false}
                      dataSource={queue}
                      columns={columns}
                      scroll={{ x: 1080 }}
                      showSorterTooltip={{ target: 'sorter-icon' }}
                      rowClassName={record => priorityRowClass(record)}
                      onRow={record => ({
                        tabIndex: 0,
                        role: 'button',
                        'aria-label': `Open invoice ${record.code}`,
                        onClick: () => setDrawerId(record.id),
                        onKeyDown: (event: KeyboardEvent) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setDrawerId(record.id)
                          }
                        },
                        style: { cursor: 'pointer' },
                      })}
                      locale={{
                        emptyText: emptyCopy ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              <Space direction="vertical" size={8}>
                                <Text strong>{emptyCopy.title}</Text>
                                <Text type="secondary">{emptyCopy.description}</Text>
                                {emptyCopy.actionLabel ? (
                                  <Button type="link" onClick={handleEmptyAction}>
                                    {emptyCopy.actionLabel}
                                  </Button>
                                ) : null}
                              </Space>
                            }
                          />
                        ) : (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Queue empty" />
                        ),
                      }}
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
        className="invoice-drawer"
        width={420}
        destroyOnClose
      >
        {drawerInvoice ? (
          <InvoiceDetailPanel
            invoice={drawerInvoice}
            onAction={kind => openAction(drawerInvoice.id, kind)}
          />
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
            const nextView = deskQueueView(
              items,
              filterByDueWindow(items, dateFilter),
              dateFilter,
              queueFilters,
            )
            message.success(
              nextView.kind === 'all-cleared'
                ? 'Saved — queue cleared'
                : 'Saved',
            )
          }}
        />
      ) : null}
    </Layout>
  )
}
