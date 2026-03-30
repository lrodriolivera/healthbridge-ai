'use client'

import { useState, useEffect, FormEvent } from 'react'
import {
  Server, Plus, Pencil, Trash2, Zap, X, Check,
  Loader2, CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react'
import { api } from '@/lib/api'

interface Connection {
  id: string
  tenant_id: string
  name: string
  base_url: string
  namespace: string
  ssl_verify: boolean
  environment: string
  last_health_check: string | null
  is_active: boolean
  created_at: string
}

interface TestResult {
  connected: boolean
  status_code?: number
  error?: string
  response_time_ms?: number
}

const envBadge: Record<string, string> = {
  dev: 'bg-blue-100 text-blue-700',
  test: 'bg-amber-100 text-amber-700',
  prod: 'bg-red-100 text-red-700',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const emptyForm = {
  name: '',
  base_url: '',
  namespace: '',
  username: '',
  password: '',
  environment: 'dev',
  ssl_verify: true,
}

export default function IrisConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Test state
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  useEffect(() => {
    loadConnections()
  }, [])

  async function loadConnections() {
    try {
      setLoading(true)
      const data = await api.listConnections()
      setConnections(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setForm({ ...emptyForm })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(conn: Connection) {
    setForm({
      name: conn.name,
      base_url: conn.base_url,
      namespace: conn.namespace,
      username: '',
      password: '',
      environment: conn.environment,
      ssl_verify: conn.ssl_verify,
    })
    setEditingId(conn.id)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        const payload: any = { ...form }
        if (!payload.username) delete payload.username
        if (!payload.password) delete payload.password
        await api.updateConnection(editingId, payload)
      } else {
        await api.createConnection(form)
      }
      closeForm()
      await loadConnections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connection')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await api.deleteConnection(id)
      setConfirmDeleteId(null)
      await loadConnections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete connection')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleTest(id: string) {
    setTestingId(id)
    setTestResults((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    try {
      const result = await api.testConnection(id)
      setTestResults((prev) => ({ ...prev, [id]: result }))
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { connected: false, error: err instanceof Error ? err.message : 'Test failed' },
      }))
    } finally {
      setTestingId(null)
    }
  }

  async function handleToggleActive(conn: Connection) {
    try {
      await api.updateConnection(conn.id, { is_active: !conn.is_active })
      await loadConnections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update connection')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-slate-500">Loading connections...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IRIS Connections</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your InterSystems IRIS server connections
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Connection
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit Connection' : 'Add Connection'}
              </h3>
              <button onClick={closeForm} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Production IRIS"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Base URL</label>
                <input
                  type="url"
                  required
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  className="input-field"
                  placeholder="https://iris.example.com:52773"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Namespace</label>
                <input
                  type="text"
                  required
                  value={form.namespace}
                  onChange={(e) => setForm({ ...form, namespace: e.target.value })}
                  className="input-field"
                  placeholder="HSLIB"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Username {editingId && <span className="text-slate-400">(leave blank to keep)</span>}
                  </label>
                  <input
                    type="text"
                    required={!editingId}
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="input-field"
                    placeholder="SuperUser"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password {editingId && <span className="text-slate-400">(leave blank to keep)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingId}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field"
                    placeholder="********"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Environment</label>
                  <select
                    value={form.environment}
                    onChange={(e) => setForm({ ...form, environment: e.target.value })}
                    className="input-field"
                  >
                    <option value="dev">Development</option>
                    <option value="test">Test</option>
                    <option value="prod">Production</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.ssl_verify}
                      onChange={(e) => setForm({ ...form, ssl_verify: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    Verify SSL
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      {editingId ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete connection</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete this IRIS connection? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary" disabled={deletingId === confirmDeleteId}>
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)} disabled={deletingId === confirmDeleteId} className="btn-danger">
                {deletingId === confirmDeleteId ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connections table */}
      {connections.length === 0 ? (
        <div className="card flex flex-col items-center py-12">
          <Server className="h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">No connections yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add your first IRIS connection to start deploying generated code.
          </p>
          <button onClick={openAdd} className="btn-primary mt-6">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Connection
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 font-medium text-slate-600">URL</th>
                <th className="px-4 py-3 font-medium text-slate-600">Namespace</th>
                <th className="px-4 py-3 font-medium text-slate-600">Env</th>
                <th className="px-4 py-3 font-medium text-slate-600">Active</th>
                <th className="px-4 py-3 font-medium text-slate-600">Last Check</th>
                <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {connections.map((conn) => (
                <tr key={conn.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{conn.name}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{conn.base_url}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{conn.namespace}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${envBadge[conn.environment] || envBadge.dev}`}>
                      {conn.environment}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(conn)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        conn.is_active ? 'bg-primary-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          conn.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                        style={{ transform: conn.is_active ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {conn.last_health_check ? formatDate(conn.last_health_check) : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTest(conn.id)}
                        disabled={testingId === conn.id}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600"
                        title="Test connection"
                      >
                        {testingId === conn.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(conn)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(conn.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Test result inline */}
                    {testResults[conn.id] && (
                      <div className="mt-1">
                        {testResults[conn.id].connected ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Connected ({testResults[conn.id].response_time_ms}ms)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {testResults[conn.id].error || 'Failed'}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
