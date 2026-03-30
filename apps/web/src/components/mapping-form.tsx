'use client'

import { useState, FormEvent } from 'react'
import { X, Save, Loader2 } from 'lucide-react'

interface MappingFormProps {
  projectId: string
  mapping?: {
    id: string
    source_component_id?: string
    target_class_name: string
    target_type: string
    target_extends?: string
    iris_layer?: string
    notes?: string
  }
  components: Array<{ id: string; name: string; component_type: string }>
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

const TARGET_TYPES = [
  'BusinessService',
  'BusinessProcess',
  'BusinessOperation',
  'DTL',
  'Message',
]

const IRIS_LAYERS = ['BS', 'BP', 'BO', 'DTL', 'MSG']

export default function MappingForm({
  mapping,
  components,
  onSave,
  onCancel,
}: MappingFormProps) {
  const [targetClassName, setTargetClassName] = useState(mapping?.target_class_name || '')
  const [targetType, setTargetType] = useState(mapping?.target_type || 'BusinessService')
  const [targetExtends, setTargetExtends] = useState(mapping?.target_extends || '')
  const [irisLayer, setIrisLayer] = useState(mapping?.iris_layer || 'BS')
  const [sourceComponentId, setSourceComponentId] = useState(mapping?.source_component_id || '')
  const [notes, setNotes] = useState(mapping?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        source_component_id: sourceComponentId || undefined,
        target_class_name: targetClassName,
        target_type: targetType,
        target_extends: targetExtends || undefined,
        iris_layer: irisLayer,
        notes: notes || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mapping')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {mapping ? 'Edit Mapping' : 'Add Mapping'}
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Source Component
            </label>
            <select
              value={sourceComponentId}
              onChange={(e) => setSourceComponentId(e.target.value)}
              className="input-field"
            >
              <option value="">-- None --</option>
              {components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.component_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Target Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={targetClassName}
              onChange={(e) => setTargetClassName(e.target.value)}
              placeholder="e.g. HBAI.BS.HL7.ADTIn"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Target Type <span className="text-red-500">*</span>
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="input-field"
              >
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                IRIS Layer <span className="text-red-500">*</span>
              </label>
              <select
                value={irisLayer}
                onChange={(e) => setIrisLayer(e.target.value)}
                className="input-field"
              >
                {IRIS_LAYERS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Extends (base class)
            </label>
            <input
              type="text"
              value={targetExtends}
              onChange={(e) => setTargetExtends(e.target.value)}
              placeholder="e.g. Ens.BusinessService"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this mapping..."
              className="input-field resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Save className="h-4 w-4" />
                  {mapping ? 'Update' : 'Create'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
