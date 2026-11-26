import { useEffect, useState } from 'react'
import { Alert, Checkbox, Form, Input, InputNumber, Modal, Select, Typography } from 'antd'
import type { ActionKind, Change, Invoice, ResolutionReason } from '@domain/index.ts'
import { actionCatalog, remaining } from '@domain/index.ts'
import { patchInvoice } from '../../api/invoices.ts'
import { disputeLabel, resolutionReasonLabel } from './labels.ts'

type Props = {
  invoice: Invoice
  kind: ActionKind
  open: boolean
  onClose: () => void
  onSaved: (invoices: Invoice[]) => void
}

export default function ActionModal({ invoice, kind, open, onClose, onSaved }: Props) {
  const [form] = Form.useForm()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const catalog = actionCatalog[kind]

  useEffect(() => {
    if (!open) return
    setErrors({})
    form.resetFields()
    if (kind === 'follow-up') form.setFieldsValue({ channel: 'Email', answered: false })
    if (kind === 'payment') form.setFieldsValue({ amount: remaining(invoice) })
    if (kind === 'dispute') form.setFieldsValue({ status: 'open' })
    if (kind === 'resolve') form.setFieldsValue({ reason: 'dispute_closed' })
  }, [open, kind, invoice, form])

  async function submit() {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    let change: Change
    switch (kind) {
      case 'follow-up':
        change = { type: 'follow-up', value: { note: values.note, channel: values.channel, answered: Boolean(values.answered) } }
        break
      case 'promise':
        change = { type: 'promise', value: { dueDate: values.dueDate, note: values.note } }
        break
      case 'payment':
        change = { type: 'payment', value: { amount: Number(values.amount), note: values.note } }
        break
      case 'resolve':
        change = { type: 'resolve', value: { reason: values.reason as ResolutionReason, note: values.note } }
        break
      case 'dispute':
        change = { type: 'dispute', value: { reason: values.reason, evidence: values.evidence ?? '', status: values.status } }
        break
      case 'route-am':
        change = { type: 'route-am', value: { note: values.note } }
        break
      case 'verify-accuracy':
        change = { type: 'verify-accuracy', value: { note: values.note } }
        break
      default: {
        const _exhaustive: never = kind
        return _exhaustive
      }
    }
    setSaving(true)
    setErrors({})
    try {
      const result = await patchInvoice(invoice.id, change)
      if (result.errors) {
        setErrors(result.errors)
        return
      }
      if (result.invoices) onSaved(result.invoices)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={catalog.label}
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      destroyOnClose
      okText={catalog.confirm}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        {catalog.purpose}
      </Typography.Paragraph>
      {kind === 'route-am' ? (
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Labeled simulation — no live account manager system." />
      ) : null}
      {errors.form ? <Alert type="error" showIcon style={{ marginBottom: 12 }} message={errors.form} /> : null}
      <Form form={form} layout="vertical" requiredMark="optional">
        {kind === 'follow-up' ? (
          <>
            <Form.Item name="note" label="Note (required)" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
              <Input.TextArea rows={3} placeholder="What did you do?" />
            </Form.Item>
            <Form.Item name="channel" label="Channel (required)" rules={[{ required: true, message: 'Required' }]}>
              <Select options={[{ value: 'Email' }, { value: 'Phone' }, { value: 'Portal' }]} />
            </Form.Item>
            <Form.Item name="answered" valuePropName="checked" label="Answered">
              <Checkbox>Customer responded</Checkbox>
            </Form.Item>
          </>
        ) : null}
        {kind === 'promise' ? (
          <>
            <Form.Item name="dueDate" label="Promise due date (required)" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.dueDate ? 'error' : undefined} help={errors.dueDate}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="note" label="Note (required)" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        ) : null}
        {kind === 'payment' ? (
          <>
            <Form.Item name="amount" label="Amount (required)" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.amount ? 'error' : undefined} help={errors.amount}>
              <InputNumber min={0.01} step={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="note" label="Note (required)" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
              <Input placeholder="e.g. Wire reference" />
            </Form.Item>
          </>
        ) : null}
        {kind === 'resolve' ? (
          <>
            <Form.Item name="reason" label="Resolution reason (required)" rules={[{ required: true, message: 'Required' }]}>
              <Select
                options={[
                  { value: 'dispute_closed', label: resolutionReasonLabel('dispute_closed') },
                  { value: 'credit_issued', label: resolutionReasonLabel('credit_issued') },
                  { value: 'other', label: resolutionReasonLabel('other') },
                ]}
              />
            </Form.Item>
            <Form.Item name="note" label="Note (required)" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        ) : null}
        {kind === 'dispute' ? (
          <>
            <Form.Item name="reason" label="Reason (required)" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.reason ? 'error' : undefined} help={errors.reason}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="evidence" label="Evidence">
              <Input />
            </Form.Item>
            <Form.Item name="status" label="Dispute status (required)" rules={[{ required: true, message: 'Required' }]}>
              <Select
                options={[
                  { value: 'open', label: disputeLabel('open') },
                  { value: 'resolved', label: disputeLabel('resolved') },
                ]}
              />
            </Form.Item>
          </>
        ) : null}
        {kind === 'route-am' || kind === 'verify-accuracy' ? (
          <Form.Item name="note" label="Note (required)" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
            <Input.TextArea rows={3} />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  )
}
