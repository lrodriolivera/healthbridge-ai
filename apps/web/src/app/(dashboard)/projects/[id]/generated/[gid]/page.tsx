'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, RefreshCw, Loader2,
  CheckCircle, XCircle, Clock, AlertTriangle, Info,
} from 'lucide-react'
import { api } from '@/lib/api'
import CodeViewer from '@/components/code-viewer'

interface GeneratedClass {
  id: string
  mapping_id: string
  project_id: string
  class_name: string
  s3_key: string
  version: number
  validation_status: string
  validation_issues: Array<{
    severity: string
    line?: number
    rule?: string
    message: string
  }>
  created_at: string
  code: string
}

const statusConfig: Record<string, { class: string; icon: any; label: string }> = {
  passed: { class: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Passed' },
  failed: { class: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' },
  pending: { class: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
}

const severityIcon: Record<string, any> = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const severityColor: Record<string, string> = {
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}

export default function GeneratedDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const classId = params.gid as string

  const [item, setItem] = useState<GeneratedClass | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Regenerate state
  const [showRegenerate, setShowRegenerate] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    loadClass()
  }, [projectId, classId])

  async function loadClass() {
    setLoading(true)
    setError('')
    try {
      const data = await api.getGenerated(projectId, classId)
      setItem(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const blob = await api.downloadGenerated(projectId, classId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${item?.class_name || 'class'}.cls`
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

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await api.regenerate(projectId, classId, feedback || undefined)
      setShowRegenerate(false)
      setFeedback('')
      // Reload to get new version
      await loadClass()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-slate-500">Loading generated class...</p>
        </div>
      </div>
    )
  }

  if (error && !item) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
        <Link href={`/projects/${projectId}/generated`} className="btn-secondary mt-4">
          Back to generated classes
        </Link>
      </div>
    )
  }

  if (!item) return null

  const badge = statusConfig[item.validation_status] || statusConfig.pending
  const BadgeIcon = badge.icon
  const issues = item.validation_issues || []

  return (
    <div>
      <Link
        href={`/projects/${projectId}/generated`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to generated classes
      </Link>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 break-all">{item.class_name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                v{item.version}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.class}`}
              >
                <BadgeIcon className="h-3 w-3" />
                {badge.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-secondary text-sm"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  Download
                </span>
              )}
            </button>
            <button
              onClick={() => setShowRegenerate(!showRegenerate)}
              className="btn-primary text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Regenerate
            </button>
          </div>
        </div>

        {/* Regenerate feedback section */}
        {showRegenerate && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Feedback for regeneration (optional)
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe what should be different in the next version..."
              className="input-field resize-none mb-3"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="btn-primary text-sm"
              >
                {regenerating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating...
                  </span>
                ) : (
                  'Start Regeneration'
                )}
              </button>
              <button
                onClick={() => {
                  setShowRegenerate(false)
                  setFeedback('')
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation issues */}
      {issues.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Validation Issues ({issues.length})
          </h2>
          <div className="space-y-2">
            {issues.map((issue, idx) => {
              const Icon = severityIcon[issue.severity] || Info
              const color = severityColor[issue.severity] || 'text-slate-400'
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                      {issue.line && <span>Line {issue.line}</span>}
                      {issue.rule && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono">
                          {issue.rule}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{issue.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Code viewer */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">ObjectScript Code</h2>
        <CodeViewer code={item.code || '// No code available'} />
      </div>
    </div>
  )
}
