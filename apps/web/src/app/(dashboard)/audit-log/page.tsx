'use client'

import { useState, useEffect, useCallback } from 'react'
import { ScrollText, ChevronDown, ChevronRight, ChevronLeft, Search, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

interface AuditLog {
  id: string
  tenant_id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

const RESOURCE_TYPES = [
  { value: '', label: 'All Resources' },
  { value: 'project', label: 'Project' },
  { value: 'mapping', label: 'Mapping' },
  { value: 'test', label: 'Test' },
  { value: 'deploy', label: 'Deploy' },
  { value: 'connection', label: 'Connection' },
]

const actionColors: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  deploy: 'bg-purple-100 text-purple-700',
  analyze: 'bg-teal-100 text-teal-700',
  execute: 'bg-orange-100 text-orange-700',
}

function getActionColor(action: string): string {
  const key = Object.keys(actionColors).find((k) => action.toLowerCase().includes(k))
  return key ? actionColors[key] : 'bg-slate-100 text-slate-700'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function truncateUuid(uuid: string): string {
  return uuid.length > 12 ? uuid.slice(0, 8) + '...' : uuid
}

const PAGE_SIZE = 20

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [resourceType, setResourceType] = useState('')
  const [actionSearch, setActionSearch] = useState('')
  const [page, setPage] = useState(0)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listAuditLogs({
        resource_type: resourceType || undefined,
        action: actionSearch || undefined,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      })
      setLogs(data.items || [])
      setTotal(data.total || 0)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [resourceType, actionSearch, page])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [resourceType, actionSearch])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-primary-600" />
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
      </div>

      {/* Filter bar */}
      <div className="card mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Resource Type</label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="input-field"
            >
              {RESOURCE_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Action</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by action..."
                value={actionSearch}
                onChange={(e) => setActionSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
          </div>
          <div className="flex items-end">
            <p className="text-sm text-slate-500">
              {total} record{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            <span className="ml-2 text-sm text-slate-500">Loading audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-8 px-4 py-3" />
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Resource</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id
                  return (
                    <tr key={log.id} className="group">
                      <td colSpan={6} className="p-0">
                        <div
                          className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                            isExpanded ? 'bg-slate-50' : ''
                          }`}
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        >
                          <div className="flex items-center">
                            <div className="w-8 px-4 py-3 text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1 px-4 py-3 text-slate-600">
                              {formatDate(log.created_at)}
                            </div>
                            <div className="flex-1 px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionColor(
                                  log.action
                                )}`}
                              >
                                {log.action}
                              </span>
                            </div>
                            <div className="flex-1 px-4 py-3">
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {log.resource_type}
                              </span>
                              {log.resource_id && (
                                <span className="ml-1.5 text-xs text-slate-400" title={log.resource_id}>
                                  {truncateUuid(log.resource_id)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 px-4 py-3 text-slate-500" title={log.user_id}>
                              {truncateUuid(log.user_id)}
                            </div>
                            <div className="flex-1 px-4 py-3 text-slate-500">
                              {log.ip_address || '-'}
                            </div>
                          </div>
                        </div>
                        {isExpanded && log.details && (
                          <div className="border-b border-slate-200 bg-slate-50 px-12 py-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                              Details
                            </p>
                            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-200">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
