import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
  Alert,
  App,
  Button,
  Checkbox,
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
  MenuOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  activityTimeline,
  compareMorningOrder,
  compareQueueColumn,
  dateFilterLabels,
  demoAccount,
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
  visibleQueue,
  type DateFilterPreset,
  type Invoice,
  type PriorityTier,
  type QueueFilters,
  type QueuePriorityFacet,
  type QueuePromiseFacet,
  type QueueStatusFacet,
} from '@domain/index.ts'
import { loadInvoices } from '../../api/invoices.ts'
import { fetchSession, signOut } from '../../api/session.ts'
import ActionModal from './ActionModal.tsx'
import BrandMark from './BrandMark.tsx'
import GuidePage from './GuidePage.tsx'
import LoginScreen from './LoginScreen.tsx'
import { InvoiceActionButtons } from './InvoiceActions.tsx'
import {
  detailsStateValue,
  disputeStateValue,
  ownerLabel,
  primaryStatusLine,
  promiseStateValue,
} from './labels.ts'
import type { ActionKind } from './primaryAction.ts'
import { PriorityTag, StatusTag, TableTag } from './queueMarks.tsx'
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
  priorityToneClass,
  type GlanceTone,
} from './tableGlance.ts'

const { Sider, Content } = Layout
const { Text } = Typography

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

function useNarrowLayout() {
  const query = '(max-width: 900px)'
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setNarrow(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return narrow
}

function SideNav({
  nav,
  onSelect,
  signingOut,
  onSignOut,
}: {
  nav: string
  onSelect: (key: string) => void
  signingOut: boolean
  onSignOut: () => void
}) {
  return (
    <div className="side-nav">
      <div className="brand">
        <BrandMark />
        <div className="brand-name">Collections Desk</div>
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[nav]}
        onClick={({ key }) => onSelect(key)}
        style={{ borderInlineEnd: 0, padding: '12px 8px' }}
        items={[
          { key: 'desk', icon: <DashboardOutlined />, label: 'Desk' },
          { key: 'guide', icon: <BookOutlined />, label: 'Guide' },
        ]}
      />
      <div className="sider-foot">
        <div className="sider-day">Demo {demoDay}</div>
        <div className="sider-user">
          <span className="sider-user-name">{demoAccount.name}</span>
          <span className="sider-user-role">{demoAccount.role}</span>
        </div>
        <button
          type="button"
          className="sider-logout"
          disabled={signingOut}
          onClick={onSignOut}
        >
          Logout
        </button>
      </div>
    </div>
  )
}

function DeskWorkspace({ onSignedOut }: { onSignedOut: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nav, setNav] = useState('desk')
  const [navOpen, setNavOpen] = useState(false)
  const [showPaid, setShowPaid] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('all-time')
  const [queueFilters, setQueueFilters] = useState<QueueFilters>(emptyQueueFilters)
  const [actionTarget, setActionTarget] = useState<{ id: string; kind: ActionKind } | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const narrow = useNarrowLayout()
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
    const rows = queueView ? visibleQueue(queueView, filtered, queueFilters, showPaid) : []
    // Default order until the operator clicks a column sorter.
    return [...rows].sort(compareMorningOrder)
  }, [queueView, filtered, queueFilters, showPaid])
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

  async function signOutOfDesk() {
    if (signingOut) return
    setSigningOut(true)
    try {
      const cleared = await signOut()
      if (cleared) onSignedOut()
      else setError('Could not sign out.')
    } catch {
      setError('Could not sign out.')
    } finally {
      setSigningOut(false)
    }
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
      width: 118,
      sorter: (a, b) => compareQueueColumn(a, b, 'priority'),
      render: (_value, row) => <PriorityTag tier={priorityTier(row)} />,
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      sorter: (a, b) => compareQueueColumn(a, b, 'status'),
      render: (_value, row) => <StatusTag label={glanceStatus(row)} tone={glanceStatusTone(row)} />,
    },
    {
      title: 'Promise',
      key: 'promise',
      width: 100,
      sorter: (a, b) => compareQueueColumn(a, b, 'promise'),
      render: (_value, row) => <TableTag label={glancePromise(row)} tone={glancePromiseTone(row)} />,
    },
    {
      title: 'Dispute',
      key: 'dispute',
      width: 100,
      sorter: (a, b) => compareQueueColumn(a, b, 'dispute'),
      render: (_value, row) => <TableTag label={glanceDispute(row)} tone={glanceDisputeTone(row)} />,
    },
    {
      title: 'Details',
      key: 'details',
      width: 120,
      sorter: (a, b) => compareQueueColumn(a, b, 'details'),
      render: (_value, row) => <TableTag label={glanceDetails(row)} tone={glanceDetailsTone(row)} />,
    },
  ]

  const onGuide = nav === 'guide'

  return (
    <Layout className="desk-shell">
      {narrow ? (
        <Drawer
          placement="left"
          open={navOpen}
          onClose={() => setNavOpen(false)}
          width="min(280px, 100vw)"
          className="nav-drawer"
          title="Menu"
          destroyOnClose
        >
          <SideNav
            nav={nav}
            signingOut={signingOut}
            onSignOut={() => { void signOutOfDesk() }}
            onSelect={key => {
              setNav(key)
              setNavOpen(false)
            }}
          />
        </Drawer>
      ) : (
        <Sider width={220} theme="light" trigger={null} className="desk-sider">
          <SideNav
            nav={nav}
            signingOut={signingOut}
            onSignOut={() => { void signOutOfDesk() }}
            onSelect={setNav}
          />
        </Sider>
      )}

      <Layout className="desk-body">
        {narrow ? (
          <header className="mobile-bar">
            <button
              type="button"
              className="nav-toggle"
              aria-label="Open menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <MenuOutlined />
            </button>
            <BrandMark />
            <span className="mobile-bar-name">Collections Desk</span>
          </header>
        ) : null}
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
                    ? 'What the desk is showing, and when each action is available.'
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
                      className="due-window"
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
                      <Checkbox
                        className="show-paid"
                        checked={showPaid}
                        aria-label="Show paid and resolved"
                        onChange={event => setShowPaid(event.target.checked)}
                      >
                        Show paid
                      </Checkbox>
                    </div>
                    <div className="queue-filter-bar" role="group" aria-label="Queue filters">
                      <label className="filter-label" htmlFor="queue-filter-status">Status</label>
                      <Select
                        id="queue-filter-status"
                        aria-label="Filter by status"
                        allowClear
                        placeholder="All"
                        className="queue-filter-control"
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
                        className="queue-filter-control"
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
                        className="queue-filter-control"
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
                      scroll={{ x: 994 }}
                      showSorterTooltip={{ target: 'sorter-icon' }}
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
        width="min(420px, 100vw)"
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

export default function DeskPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    fetchSession()
      .then(ok => {
        if (alive) setAuthed(ok)
      })
      .catch(() => {
        if (alive) setAuthed(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (authed === null) {
    return (
      <div className="gate-loading">
        <Spin />
      </div>
    )
  }
  if (!authed) return <LoginScreen onSignedIn={() => setAuthed(true)} />
  return <DeskWorkspace onSignedOut={() => setAuthed(false)} />
}
