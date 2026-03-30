'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Wand2, Play, Check, Pencil, Trash2,
  Loader2, AlertCircle, Zap, RefreshCw,
} from 'lucide-react'
import { api } from '@/lib/api'
import MappingGraph from '@/components/mapping-graph'
import MappingForm from '@/components/mapping-form'

interface Mapping {
  id: string
  project_id: string
  source_component_id?: string
  target_class_name: string
  target_type: string
  target_extends?: string
  iris_layer?: string
  settings?: any
  notes?: string
  auto_generated: boolean
  confirmed_by?: string
  created_at: string
}

interface Component {
  id: string
  name: string
  component_type: string
}

const layerBadge: Record<string, string> = {
  BS: 'bg-emerald-100 text-emerald-700',
  BP: 'bg-blue-100 text-blue-700',
  BO: 'bg-purple-100 text-purple-700',
  DTL: 'bg-amber-100 text-amber-700',
  MSG: 'bg-slate-100 text-slate-600',
}

export default function MappingsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [mappings, setMappings] = useState<Mapping[]>([])
  const [components, setComponents] = useState<Component[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingMapping, setEditingMapping] = useState<Mapping | undefined>(undefined)

  // Auto-generate state
  const [autoGenerating, setAutoGenerating] = useState(false)

  // Graph refresh key
  const [graphKey, setGraphKey] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [mappingsRes, compsRes] = await Promise.all([
        api.listMappings(projectId, 0, 100),
        api.listComponents(projectId, 0, 100).catch(() => ({ items: [], total: 0 })),
      ])
      setMappings(mappingsRes.items || [])
      setTotal(mappingsRes.total || 0)
      setComponents(compsRes.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mappings')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAutoGenerate() {
    setAutoGenerating(true)
    setError('')
    try {
      const result = await api.autoGenerateMappings(projectId)
      setMappings(result.items || [])
      setTotal(result.total || 0)
      setGraphKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-generate mappings')
    } finally {
      setAutoGenerating(false)
    }
  }

  async function handleConfirm(mappingId: string) {
    setActionLoading(mappingId)
    try {
      const updated = await api.confirmMapping(projectId, mappingId)
      setMappings((prev) =>
        prev.map((m) => (m.id === mappingId ? updated : m))
      )
      setGraphKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm mapping')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(mappingId: string) {
    if (!confirm('Delete this mapping?')) return
    setActionLoading(mappingId)
    try {
      await api.deleteMapping(projectId, mappingId)
      setMappings((prev) => prev.filter((m) => m.id !== mappingId))
      setTotal((t) => t - 1)
      setGraphKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mapping')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleGenerateSingle(mappingId: string) {
    setActionLoading(mappingId)
    try {
      await api.generateSingle(projectId, mappingId)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleGenerateAll() {
    setActionLoading('generate-all')
    try {
      await api.generateAll(projectId)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSaveMapping(data: any) {
    if (editingMapping) {
      const updated = await api.updateMapping(projectId, editingMapping.id, data)
      setMappings((prev) =>
        prev.map((m) => (m.id === editingMapping.id ? updated : m))
      )
    } else {
      const created = await api.createMapping(projectId, data)
      setMappings((prev) => [...prev, created])
      setTotal((t) => t + 1)
    }
    setShowForm(false)
    setEditingMapping(undefined)
    setGraphKey((k) => k + 1)
  }

  const confirmedCount = mappings.filter((m) => m.confirmed_by).length

  return (
    <div>
      <Link
        href={`/projects/${projectId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mappings</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} mapping{total !== 1 ? 's' : ''} ({confirmedCount} confirmed)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoGenerate}
            disabled={autoGenerating}
            className="btn-secondary text-sm"
          >
            {autoGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Wand2 className="h-4 w-4" />
                Auto-Generate
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setEditingMapping(undefined)
              setShowForm(true)
            }}
            className="btn-primary text-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Mapping
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Graph visualization */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Mapping Graph</h2>
        <MappingGraph key={graphKey} projectId={projectId} />
      </div>

      {/* Generate All button */}
      {confirmedCount > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleGenerateAll}
            disabled={actionLoading === 'generate-all'}
            className="btn-primary text-sm"
          >
            {actionLoading === 'generate-all' ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting generation...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                Generate All ({confirmedCount} confirmed)
              </span>
            )}
          </button>
        </div>
      )}

      {/* Mappings table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : mappings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 mb-2">No mappings yet</p>
          <p className="text-sm text-slate-400">
            Use Auto-Generate to create mappings from analyzed components, or add them manually.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Target Class
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Layer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">
                      {m.target_class_name}
                    </div>
                    {m.auto_generated && (
                      <span className="text-xs text-slate-400">auto-generated</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.target_type}</td>
                  <td className="px-4 py-3">
                    {m.iris_layer && (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          layerBadge[m.iris_layer] || layerBadge.MSG
                        }`}
                      >
                        {m.iris_layer}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.confirmed_by ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Check className="h-3 w-3" />
                        Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!m.confirmed_by && (
                        <button
                          onClick={() => handleConfirm(m.id)}
                          disabled={actionLoading === m.id}
                          className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                          title="Confirm"
                        >
                          {actionLoading === m.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingMapping(m)
                          setShowForm(true)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {m.confirmed_by && (
                        <button
                          onClick={() => handleGenerateSingle(m.id)}
                          disabled={actionLoading === m.id}
                          className="rounded-lg p-1.5 text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Generate code"
                        >
                          {actionLoading === m.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={actionLoading === m.id}
                        className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mapping form modal */}
      {showForm && (
        <MappingForm
          projectId={projectId}
          mapping={editingMapping}
          components={components}
          onSave={handleSaveMapping}
          onCancel={() => {
            setShowForm(false)
            setEditingMapping(undefined)
          }}
        />
      )}
    </div>
  )
}
