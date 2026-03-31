'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileDown, Loader2, Box, GitBranch, Code2, FlaskConical,
  CheckCircle, Circle,
} from 'lucide-react'
import { api } from '@/lib/api'

interface ProjectSummary {
  project: {
    id: string
    name: string
    source_platform: string
    status: string
    created_at: string
  }
  stats: {
    components: number
    mappings: number
    generated_classes: number
    tests: number
    deploys: number
  }
  phases: {
    upload: boolean
    analysis: boolean
    mapping: boolean
    generation: boolean
    validation: boolean
    deploy: boolean
    testing: boolean
  }
}

const PIPELINE_STEPS = [
  { key: 'upload', label: 'Upload', icon: FileDown },
  { key: 'analysis', label: 'Analysis', icon: Box },
  { key: 'mapping', label: 'Mapping', icon: GitBranch },
  { key: 'generation', label: 'Code Generation', icon: Code2 },
  { key: 'validation', label: 'Validation', icon: CheckCircle },
  { key: 'deploy', label: 'Deploy', icon: Box },
  { key: 'testing', label: 'Testing', icon: FlaskConical },
] as const

export default function ExportPage() {
  const params = useParams()
  const projectId = params.id as string

  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSummary()
  }, [projectId])

  async function loadSummary() {
    try {
      setLoading(true)
      const data = await api.getProjectSummary(projectId)
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      await api.downloadDocumentation(projectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-sm text-slate-500">Loading export data...</p>
        </div>
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
        <Link href={`/projects/${projectId}`} className="btn-secondary mt-4">
          Back to project
        </Link>
      </div>
    )
  }

  if (!summary) return null

  const { project, stats, phases } = summary
  const completedSteps = Object.values(phases).filter(Boolean).length
  const totalSteps = Object.keys(phases).length

  return (
    <div>
      <Link
        href={`/projects/${projectId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
            <h1 className="text-2xl font-bold text-slate-900">Export Documentation</h1>
            <p className="mt-1 text-slate-500">
              {project.name} — Migration summary and documentation export
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary"
          >
            {downloading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                Download Documentation
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <Box className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.components}</p>
              <p className="text-xs text-slate-500">Components</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <GitBranch className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.mappings}</p>
              <p className="text-xs text-slate-500">Mappings</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Code2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.generated_classes}</p>
              <p className="text-xs text-slate-500">Generated Classes</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
              <FlaskConical className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.tests}</p>
              <p className="text-xs text-slate-500">Tests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline progress */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Pipeline Progress</h2>
          <span className="text-sm text-slate-500">
            {completedSteps}/{totalSteps} phases completed
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-primary-500 transition-all"
            style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map((step) => {
            const completed = phases[step.key as keyof typeof phases]
            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                  completed
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                {completed ? (
                  <CheckCircle className="h-5 w-5 shrink-0 text-primary-600" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                )}
                <span
                  className={`text-sm font-medium ${
                    completed ? 'text-primary-700' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Preview section */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Summary Preview</h2>
        <div className="space-y-4 rounded-lg bg-slate-50 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Project Name
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">{project.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Source Platform
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">{project.source_platform}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{project.status}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Created
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {new Date(project.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Migration Metrics
            </p>
            <div className="mt-2 flex flex-wrap gap-4">
              <span className="text-sm text-slate-600">
                <strong>{stats.components}</strong> source components analyzed
              </span>
              <span className="text-sm text-slate-600">
                <strong>{stats.mappings}</strong> mappings defined
              </span>
              <span className="text-sm text-slate-600">
                <strong>{stats.generated_classes}</strong> IRIS classes generated
              </span>
              <span className="text-sm text-slate-600">
                <strong>{stats.tests}</strong> test cases
              </span>
              <span className="text-sm text-slate-600">
                <strong>{stats.deploys}</strong> deployments
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
