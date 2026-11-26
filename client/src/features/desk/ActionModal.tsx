import { useEffect, useState } from 'react'
import { Alert, Checkbox, Form, Input, InputNumber, Modal, Select } from 'antd'
import type { Change, Invoice, ResolutionReason } from '@domain/index.ts'
import { remaining } from '@domain/index.ts'
import { patchInvoice } from '../../api/invoices.ts'
import type { ActionModal as ActionKind } from './primaryAction.ts'

type Props = {
  invoice: Invoice
  kind: ActionKind
  open: boolean
  onClose: () => void
  onSaved: (invoices: Invoice[]) => void
}

const titles: Record<ActionKind, string> = {
  'follow-up': 'Record follow-up',
  promise: 'Record promise',
  payment: 'Payment received',
  resolve: 'Resolve (not paid)',
  dispute: 'Mark dispute',
  'route-am': 'Route to AM (simulation)',
  'verify-accuracy': 'Verify InvoiceAccuracy',
}

export default function ActionModal({ invoice, kind, open, onClose, onSaved }: Props) {
  const [form] = Form.useForm()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

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
      title={titles[kind]}
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      destroyOnClose
      okText="Save"
    >
      {kind === 'route-am' ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Labeled simulation — no live AM handoff."
        />
      ) : null}
      {errors.form ? <Alert type="error" showIcon style={{ marginBottom: 12 }} message={errors.form} /> : null}
      <Form form={form} layout="vertical" requiredMark={false}>
        {kind === 'follow-up' ? (
          <>
            <Form.Item name="note" label="Note" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="channel" label="Channel" rules={[{ required: true, message: 'Required' }]}>
              <Select options={[{ value: 'Email' }, { value: 'Phone' }, { value: 'Portal' }]} />
            </Form.Item>
            <Form.Item name="answered" valuePropName="checked">
              <Checkbox>Answered</Checkbox>
            </Form.Item>
          </>
        ) : null}
        {kind === 'promise' ? (
          <>
            <Form.Item name="dueDate" label="Promise due date" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.dueDate ? 'error' : undefined} help={errors.dueDate}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="note" label="Note" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        ) : null}
        {kind === 'payment' ? (
          <>
            <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.amount ? 'error' : undefined} help={errors.amount}>
              <InputNumber min={0.01} step={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="note" label="Note" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
              <Input />
            </Form.Item>
          </>
        ) : null}
        {kind === 'resolve' ? (
          <>
            <Form.Item name="reason" label="ResolutionReason" rules={[{ required: true, message: 'Required' }]}>
              <Select
                options={[
                  { value: 'dispute_closed', label: 'dispute_closed' },
                  { value: 'credit_issued', label: 'credit_issued' },
                  { value: 'other', label: 'other' },
                ]}
              />
            </Form.Item>
            <Form.Item name="note" label="Note" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        ) : null}
        {kind === 'dispute' ? (
          <>
            <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.reason ? 'error' : undefined} help={errors.reason}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="evidence" label="Evidence">
              <Input />
            </Form.Item>
            <Form.Item name="status" label="DisputeStatus" rules={[{ required: true, message: 'Required' }]}>
              <Select options={[{ value: 'open' }, { value: 'resolved' }]} />
            </Form.Item>
          </>
        ) : null}
        {kind === 'route-am' || kind === 'verify-accuracy' ? (
          <Form.Item name="note" label="Note" rules={[{ required: true, message: 'Required' }]} validateStatus={errors.note ? 'error' : undefined} help={errors.note}>
            <Input.TextArea rows={3} />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  )
}
