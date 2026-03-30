'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Zap, Loader2, AlertCircle,
  CheckCircle, XCircle, Clock,
} from 'lucide-react'
import { api } from '@/lib/api'

interface GeneratedClass {
  id: string
  mapping_id: string
  project_id: string
  class_name: string
  s3_key: string
  version: number
  validation_status: string
  validation_issues: any[]
  created_at: string
}

const statusBadge: Record<string, { class: string; icon: any; label: string }> = {
  passed: { class: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Passed' },
  failed: { class: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' },
  pending: { class: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function GeneratedListPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [items, setItems] = useState<GeneratedClass[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.listGenerated(projectId, 0, 200)
      setItems(res.items || [])
      setTotal(res.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load generated classes')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleDownloadAll() {
    setDownloading(true)
    try {
      const blob = await api.downloadAllGenerated(projectId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `generated-classes-${projectId}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download')
    } finally {
      setDownloading(false)
    }
  }

  async function handleGenerateAll() {
    setGenerating(true)
    try {
      await api.generateAll(projectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
    } finally {
      setGenerating(false)
    }
  }

  const passedCount = items.filter((i) => i.validation_status === 'passed').length

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
          <h1 className="text-2xl font-bold text-slate-900">Generated Classes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} class{total !== 1 ? 'es' : ''} generated
            {total > 0 && ` (${passedCount} passed validation)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="btn-secondary text-sm"
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  Download All
                </span>
              )}
            </button>
          )}
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="btn-primary text-sm"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                Generate All
              </span>
            )}
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <Zap className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-1">No generated classes yet</p>
          <p className="text-sm text-slate-400">
            Confirm mappings first, then generate ObjectScript code.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const badge = statusBadge[item.validation_status] || statusBadge.pending
            const BadgeIcon = badge.icon
            const issueCount = (item.validation_issues || []).length
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/projects/${projectId}/generated/${item.id}`)}
                className="card text-left hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 break-all">
                    {item.class_name}
                  </h3>
                  <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    v{item.version}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.class}`}
                  >
                    <BadgeIcon className="h-3 w-3" />
                    {badge.label}
                  </span>
                  {issueCount > 0 && (
                    <span className="text-xs text-slate-400">
                      {issueCount} issue{issueCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
