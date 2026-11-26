import { useEffect, useState } from 'react'
import { Alert, Checkbox, Form, Input, InputNumber, Modal, Select, Typography } from 'antd'
import type { ActionKind, Change, Invoice, ResolutionReason } from '@domain/index.ts'
import { actionPresentation, remaining } from '@domain/index.ts'
import { patchInvoice } from '../../api/invoices.ts'
import { resolutionReasonLabel } from './labels.ts'

type Props = {
  invoice: Invoice
  kind: ActionKind
  open: boolean
  onClose: () => void
  onSaved: (invoices: Invoice[]) => void
}

function noteValue(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

export default function ActionModal({ invoice, kind, open, onClose, onSaved }: Props) {
  const [form] = Form.useForm()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const catalog = actionPresentation(invoice, kind)

  useEffect(() => {
    if (!open) return
    setErrors({})
    form.resetFields()
    if (kind === 'follow-up') form.setFieldsValue({ channel: 'Email', answered: false })
    if (kind === 'payment') form.setFieldsValue({ amount: remaining(invoice) })
    if (kind === 'promise' && invoice.promise) {
      form.setFieldsValue({ dueDate: invoice.promise.dueDate, note: invoice.promise.note })
    }
    if (kind === 'dispute') {
      form.setFieldsValue({
        reason: invoice.dispute?.status === 'open' ? invoice.dispute.reason : '',
        evidence: invoice.dispute?.status === 'open' ? invoice.dispute.evidence : '',
      })
    }
    if (kind === 'resolve') form.setFieldsValue({ reason: 'dispute_closed' })
  }, [open, kind, invoice, form])

  async function submit() {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    let change: Change
    switch (kind) {
      case 'follow-up':
        change = {
          type: 'follow-up',
          value: {
            note: noteValue(values.note),
            channel: noteValue(values.channel) || 'Email',
            answered: Boolean(values.answered),
          },
        }
        break
      case 'flag-details':
        change = { type: 'flag-details', value: { note: noteValue(values.note) } }
        break
      case 'confirm-details':
        change = { type: 'confirm-details', value: { note: noteValue(values.note) } }
        break
      case 'cancel-details':
        change = { type: 'cancel-details', value: { note: noteValue(values.note) } }
        break
      case 'cancel-promise':
        change = { type: 'cancel-promise', value: { note: noteValue(values.note) } }
        break
      case 'cancel-dispute':
        change = { type: 'cancel-dispute', value: { note: noteValue(values.note) } }
        break
      case 'promise':
        change = {
          type: 'promise',
          value: { dueDate: noteValue(values.dueDate), note: noteValue(values.note) },
        }
        break
      case 'payment':
        change = {
          type: 'payment',
          value: { amount: Number(values.amount), note: noteValue(values.note) },
        }
        break
      case 'resolve':
        change = {
          type: 'resolve',
          value: { reason: values.reason as ResolutionReason, note: noteValue(values.note) },
        }
        break
      case 'dispute':
        change = {
          type: 'dispute',
          value: {
            reason: noteValue(values.reason),
            evidence: noteValue(values.evidence),
            status: 'open',
          },
        }
        break
      case 'route-am':
        change = { type: 'route-am', value: { note: noteValue(values.note) } }
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

  const noteOnly =
    kind === 'route-am'
    || kind === 'flag-details'
    || kind === 'confirm-details'
    || kind === 'cancel-details'
    || kind === 'cancel-promise'
    || kind === 'cancel-dispute'

  const fieldErrors = Object.entries(errors).filter(([key]) => key !== 'form')

  return (
    <Modal
      title={catalog.label}
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      destroyOnClose
      width="min(520px, calc(100vw - 32px))"
      okText={catalog.confirm}
      okButtonProps={{ 'aria-label': catalog.confirm }}
      cancelButtonProps={{ 'aria-label': 'Cancel' }}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        {catalog.purpose}
      </Typography.Paragraph>
      {kind === 'route-am' ? (
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Labeled simulation — no live account manager system." />
      ) : null}
      <div role="status" aria-live="polite">
        {errors.form ? (
          <Alert type="error" showIcon style={{ marginBottom: 12 }} message={errors.form} />
        ) : null}
        {fieldErrors.length > 0 ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="Fix the highlighted fields and try again."
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {fieldErrors.map(([key, message]) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            }
          />
        ) : null}
      </div>
      <Form form={form} layout="vertical" requiredMark="optional">
        {kind === 'follow-up' ? (
          <>
            <Form.Item
              name="note"
              label="Note"
              rules={[{ required: true, message: 'Describe the follow-up.' }]}
              validateStatus={errors.note ? 'error' : undefined}
              help={errors.note}
            >
              <Input.TextArea rows={3} placeholder="What did you do?" aria-required="true" />
            </Form.Item>
            <Form.Item
              name="channel"
              label="Channel"
              rules={[{ required: true, message: 'Choose a channel.' }]}
            >
              <Select
                aria-label="Channel"
                options={[{ value: 'Email' }, { value: 'Phone' }, { value: 'Portal' }]}
              />
            </Form.Item>
            <Form.Item name="answered" valuePropName="checked" label="Answered">
              <Checkbox>Customer responded</Checkbox>
            </Form.Item>
          </>
        ) : null}
        {kind === 'promise' ? (
          <>
            <Form.Item
              name="dueDate"
              label="Promise due date"
              rules={[{ required: true, message: 'Enter a promise due date.' }]}
              validateStatus={errors.dueDate ? 'error' : undefined}
              help={errors.dueDate}
            >
              <Input type="date" aria-required="true" aria-label="Promise due date" />
            </Form.Item>
            <Form.Item
              name="note"
              label="Note"
              rules={[{ required: true, message: 'Describe the promise.' }]}
              validateStatus={errors.note ? 'error' : undefined}
              help={errors.note}
            >
              <Input.TextArea rows={2} aria-required="true" />
            </Form.Item>
          </>
        ) : null}
        {kind === 'payment' ? (
          <>
            <Form.Item
              name="amount"
              label="Amount"
              rules={[{ required: true, message: 'Enter a payment amount.' }]}
              validateStatus={errors.amount ? 'error' : undefined}
              help={errors.amount}
            >
              <InputNumber min={0.01} step={1} style={{ width: '100%' }} aria-required="true" aria-label="Payment amount" />
            </Form.Item>
            <Form.Item
              name="note"
              label="Note"
              rules={[{ required: true, message: 'Add a payment note.' }]}
              validateStatus={errors.note ? 'error' : undefined}
              help={errors.note}
            >
              <Input placeholder="e.g. Wire reference" aria-required="true" />
            </Form.Item>
          </>
        ) : null}
        {kind === 'resolve' ? (
          <>
            <Form.Item
              name="reason"
              label="Resolution reason"
              rules={[{ required: true, message: 'Choose a resolution reason.' }]}
            >
              <Select
                aria-label="Resolution reason"
                options={[
                  { value: 'dispute_closed', label: resolutionReasonLabel('dispute_closed') },
                  { value: 'credit_issued', label: resolutionReasonLabel('credit_issued') },
                  { value: 'other', label: resolutionReasonLabel('other') },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="note"
              label="Note"
              rules={[{ required: true, message: 'Explain why this is resolved without payment.' }]}
              validateStatus={errors.note ? 'error' : undefined}
              help={errors.note}
            >
              <Input.TextArea rows={2} aria-required="true" />
            </Form.Item>
          </>
        ) : null}
        {kind === 'dispute' ? (
          <>
            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true, message: 'Describe the dispute.' }]}
              validateStatus={errors.reason ? 'error' : undefined}
              help={errors.reason}
            >
              <Input.TextArea rows={2} aria-required="true" />
            </Form.Item>
            <Form.Item name="evidence" label="Evidence">
              <Input aria-label="Evidence" />
            </Form.Item>
          </>
        ) : null}
        {noteOnly ? (
          <Form.Item
            name="note"
            label="Note"
            rules={[{ required: true, message: 'Add a note.' }]}
            validateStatus={errors.note ? 'error' : undefined}
            help={errors.note}
          >
            <Input.TextArea rows={3} aria-required="true" />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  )
}
