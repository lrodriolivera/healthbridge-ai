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
  class_name: string
  version: number
  validation_status: string
  validation_issues: any[]
  created_at: string
}

interface Progress {
  status: string
  is_running: boolean
  confirmed_mappings: number
  generated: number
  passed: number
  failed: number
  progress_pct: number
}

const statusBadge: Record<string, { class: string; icon: any; label: string }> = {
  passed: { class: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Passed' },
  failed: { class: 'bg-red-100 text-red-700', icon: XCircle, label: 'Failed' },
  pending: { class: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
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
  const [progress, setProgress] = useState<Progress | null>(null)
  const [polling, setPolling] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [res, prog] = await Promise.all([
        api.listGenerated(projectId, 0, 100),
        api.getGenerationProgress(projectId),
      ])
      setItems(res.items || [])
      setTotal(res.total || 0)
      setProgress(prog)
      if (prog.is_running) setPolling(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadData() }, [loadData])

  // Poll while generating
  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      try {
        const [res, prog] = await Promise.all([
          api.listGenerated(projectId, 0, 100),
          api.getGenerationProgress(projectId),
        ])
        setItems(res.items || [])
        setTotal(res.total || 0)
        setProgress(prog)
        if (!prog.is_running) {
          setPolling(false)
          setGenerating(false)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [polling, projectId])

  async function handleGenerateAll() {
    setGenerating(true)
    setError('')
    try {
      await api.generateAll(projectId)
      setPolling(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
      setGenerating(false)
    }
  }

  async function handleDownloadAll() {
    setDownloading(true)
    try {
      const blob = await api.downloadAllGenerated(projectId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'generated-classes.zip'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const isRunning = progress?.is_running || generating

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
            {progress && total > 0 && ` (${progress.passed} passed)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <button onClick={handleDownloadAll} disabled={downloading} className="btn-secondary text-sm">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? ' Downloading...' : ' Download All'}
            </button>
          )}
          <button onClick={handleGenerateAll} disabled={isRunning} className="btn-primary text-sm">
            {isRunning ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
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

      {/* Progress bar while generating */}
      {isRunning && progress && (
        <div className="card mb-6 border-teal-200 bg-teal-50">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            <div>
              <h3 className="text-sm font-semibold text-teal-800">Generating ObjectScript code...</h3>
              <p className="text-xs text-teal-600">
                {progress.generated} / {progress.confirmed_mappings} classes generated
                {progress.passed > 0 && ` • ${progress.passed} passed`}
                {progress.failed > 0 && ` • ${progress.failed} failed`}
              </p>
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-teal-200">
            <div
              className="h-3 rounded-full bg-teal-500 transition-all duration-500"
              style={{ width: `${progress.progress_pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-teal-500 text-right">{progress.progress_pct}%</p>
        </div>
      )}

      {/* Completed summary */}
      {!isRunning && progress && progress.generated > 0 && (
        <div className="card mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-slate-700">Generation complete</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-600">{progress.passed} passed</span>
            {progress.failed > 0 && <span className="text-red-500">{progress.failed} failed</span>}
            <span className="text-slate-400">{progress.generated} total</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </div>
      ) : items.length === 0 && !isRunning ? (
        <div className="card text-center py-12">
          <Zap className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-1">No generated classes yet</p>
          <p className="text-sm text-slate-400">Click Generate All to start code generation.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const badge = statusBadge[item.validation_status] || statusBadge.pending
            const BadgeIcon = badge.icon
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/projects/${projectId}/generated/${item.id}`)}
                className="card text-left hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 break-all">{item.class_name}</h3>
                  <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">v{item.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.class}`}>
                    <BadgeIcon className="h-3 w-3" />
                    {badge.label}
                  </span>
                  {(item.validation_issues || []).length > 0 && (
                    <span className="text-xs text-slate-400">{item.validation_issues.length} issues</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
