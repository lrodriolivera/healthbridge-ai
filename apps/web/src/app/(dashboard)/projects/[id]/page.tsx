'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Trash2, X, Check,
  Upload, Box, Play, Loader2, CheckCircle, AlertCircle,
  GitBranch, Code2, Rocket, Server, FlaskConical, FileDown,
} from 'lucide-react'
import { api } from '@/lib/api'

interface Project {
  id: string
  name: string
  description: string | null
  source_platform: string
  status: string
  created_at: string
  updated_at: string
}

const platformLabels: Record<string, string> = {
  oracle_soa: 'Oracle SOA/OSB',
  mirth_connect: 'Mirth Connect',
  rhapsody: 'Rhapsody',
  cloverleaf: 'Cloverleaf',
  biztalk: 'BizTalk',
  other: 'Other',
}

const platformColors: Record<string, string> = {
  oracle_soa: 'bg-orange-100 text-orange-700',
  mirth_connect: 'bg-blue-100 text-blue-700',
  rhapsody: 'bg-purple-100 text-purple-700',
  cloverleaf: 'bg-green-100 text-green-700',
  biztalk: 'bg-indigo-100 text-indigo-700',
  other: 'bg-slate-100 text-slate-700',
}

const statusColors: Record<string, string> = {
  created: 'bg-slate-100 text-slate-600',
  analyzing: 'bg-yellow-100 text-yellow-700',
  mapping: 'bg-blue-100 text-blue-700',
  generating: 'bg-purple-100 text-purple-700',
  validating: 'bg-cyan-100 text-cyan-700',
  deploying: 'bg-orange-100 text-orange-700',
  testing: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Phase 1 state
  const [uploadCount, setUploadCount] = useState(0)
  const [componentCount, setComponentCount] = useState(0)
  const [complexitySummary, setComplexitySummary] = useState<Record<string, number>>({})
  const [analysisStatus, setAnalysisStatus] = useState<{
    status: string; total_files: number; analyzed: number; failed: number
  } | null>(null)
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false)

  // Phase 2 state
  const [mappingTotal, setMappingTotal] = useState(0)
  const [mappingConfirmed, setMappingConfirmed] = useState(0)
  const [generatedTotal, setGeneratedTotal] = useState(0)
  const [generatedPassed, setGeneratedPassed] = useState(0)

  // Phase 3 state (deploy)
  const [deployStatus, setDeployStatus] = useState<{
    status: string; total_classes: number; deployed: number; failed: number
  } | null>(null)
  const [deployHistory, setDeployHistory] = useState<any[]>([])

  // Phase 4 state (testing)
  const [testTotal, setTestTotal] = useState(0)
  const [testResultsSummary, setTestResultsSummary] = useState<{
    total: number; passed: number; failed: number; errors: number
  } | null>(null)

  useEffect(() => {
    loadProject()
    loadPhase1Data()
    loadPhase2Data()
    loadPhase3Data()
    loadPhase4Data()
  }, [projectId])

  // Poll analysis status when running
  useEffect(() => {
    const isRunning = analysisStatus?.status === 'running' || analysisStatus?.status === 'queued'
    if (!isRunning) return
    const interval = setInterval(async () => {
      try {
        const status = await api.getAnalysisStatus(projectId)
        setAnalysisStatus(status)
        if (status.status !== 'running' && status.status !== 'queued') {
          // Reload components after analysis completes
          loadPhase1Data()
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [analysisStatus?.status, projectId])

  async function loadPhase1Data() {
    try {
      const uploads = await api.listUploads(projectId)
      setUploadCount((uploads.items || []).length)
    } catch { /* no uploads yet */ }
    try {
      const comps = await api.listComponents(projectId, 0, 100)
      const items = comps.items || []
      setComponentCount(comps.total || 0)
      const summary: Record<string, number> = {}
      for (const c of items) {
        summary[c.complexity] = (summary[c.complexity] || 0) + 1
      }
      setComplexitySummary(summary)
    } catch { /* no components yet */ }
    try {
      const status = await api.getAnalysisStatus(projectId)
      setAnalysisStatus(status)
    } catch { /* no analysis yet */ }
  }

  async function loadPhase2Data() {
    try {
      const mappings = await api.listMappings(projectId, 0, 1)
      setMappingTotal(mappings.total || 0)
      // Load all to count confirmed
      if (mappings.total > 0) {
        const all = await api.listMappings(projectId, 0, 200)
        setMappingConfirmed((all.items || []).filter((m: any) => m.confirmed_by).length)
      }
    } catch { /* no mappings yet */ }
    try {
      const generated = await api.listGenerated(projectId, 0, 200)
      setGeneratedTotal(generated.total || 0)
      setGeneratedPassed((generated.items || []).filter((g: any) => g.validation_status === 'passed').length)
    } catch { /* no generated yet */ }
  }

  async function loadPhase3Data() {
    try {
      const status = await api.getDeployStatus(projectId)
      setDeployStatus(status)
    } catch { /* no deploy yet */ }
    try {
      const history = await api.getDeployHistory(projectId)
      setDeployHistory(history.items || [])
    } catch { /* no history yet */ }
  }

  async function loadPhase4Data() {
    try {
      const tests = await api.listTests(projectId, 0, 1)
      setTestTotal(tests.total || 0)
    } catch { /* no tests yet */ }
    try {
      const results = await api.listTestResults(projectId, 0, 1)
      setTestResultsSummary({
        total: results.total || 0,
        passed: results.passed || 0,
        failed: results.failed || 0,
        errors: results.errors || 0,
      })
    } catch { /* no results yet */ }
  }

  async function handleTriggerAnalysis() {
    setTriggeringAnalysis(true)
    try {
      await api.triggerAnalysis(projectId)
      const status = await api.getAnalysisStatus(projectId)
      setAnalysisStatus(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger analysis')
    } finally {
      setTriggeringAnalysis(false)
    }
  }

  async function loadProject() {
    try {
      setLoading(true)
      const data = await api.getProject(projectId)
      setProject(data)
      setEditName(data.name)
      setEditDescription(data.description || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await api.updateProject(projectId, {
        name: editName,
        description: editDescription || null,
      })
      setProject(updated)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deleteProject(projectId)
      router.push('/projects')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-slate-500">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
        <Link href="/projects" className="btn-secondary mt-4">
          Back to projects
        </Link>
      </div>
    )
  }

  if (!project) return null

  return (
    <div>
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Project header */}
      <div className="card mb-6">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Project name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="input-field resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <Check className="mr-1.5 h-4 w-4" />
                    Save
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setEditName(project.name)
                  setEditDescription(project.description || '')
                }}
                className="btn-secondary"
              >
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusColors[project.status] || statusColors.created
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="mt-2 text-slate-500">{project.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/projects/${projectId}/export`}
                  className="btn-secondary"
                >
                  <FileDown className="mr-1.5 h-4 w-4" />
                  Export
                </Link>
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary"
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-danger"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>

            <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Source Platform
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    platformColors[project.source_platform] || platformColors.other
                  }`}
                >
                  {platformLabels[project.source_platform] || project.source_platform}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Target Platform
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  InterSystems IRIS / TrackCare
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Created
                </p>
                <p className="mt-1 text-sm text-slate-700">{formatDate(project.created_at)}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete project</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete <strong>{project.name}</strong>? This action cannot
              be undone. All project data, mappings, and generated code will be permanently
              removed.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger">
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Deleting...
                  </span>
                ) : (
                  'Delete project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline sections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Migration Pipeline</h2>

        {/* Files section */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-primary-500" />
              <div>
                <h3 className="font-medium text-slate-900">Files</h3>
                <p className="text-sm text-slate-500">
                  {uploadCount > 0 ? `${uploadCount} file${uploadCount !== 1 ? 's' : ''} uploaded` : 'No files uploaded yet'}
                </p>
              </div>
            </div>
            <Link href={`/projects/${projectId}/uploads`} className="btn-secondary text-sm">
              Manage Files
            </Link>
          </div>
        </div>

        {/* Analysis section */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {analysisStatus?.status === 'running' || analysisStatus?.status === 'queued' ? (
                <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
              ) : analysisStatus?.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : analysisStatus?.status === 'failed' ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Play className="h-5 w-5 text-slate-400" />
              )}
              <div>
                <h3 className="font-medium text-slate-900">Analysis</h3>
                {analysisStatus?.status === 'running' || analysisStatus?.status === 'queued' ? (
                  <p className="text-sm text-yellow-600">
                    Analyzing... ({analysisStatus.analyzed}/{analysisStatus.total_files} files)
                  </p>
                ) : analysisStatus?.status === 'completed' ? (
                  <p className="text-sm text-green-600">
                    Complete: {analysisStatus.analyzed} files analyzed
                    {analysisStatus.failed > 0 && ` (${analysisStatus.failed} failed)`}
                  </p>
                ) : analysisStatus?.status === 'failed' ? (
                  <p className="text-sm text-red-600">Analysis failed</p>
                ) : (
                  <p className="text-sm text-slate-500">Not started</p>
                )}
              </div>
            </div>
            {!(analysisStatus?.status === 'running' || analysisStatus?.status === 'queued') && uploadCount > 0 && (
              <button
                onClick={handleTriggerAnalysis}
                disabled={triggeringAnalysis}
                className="btn-primary text-sm"
              >
                {triggeringAnalysis ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    {analysisStatus?.status === 'completed' ? 'Re-analyze' : 'Analyze'}
                  </span>
                )}
              </button>
            )}
          </div>
          {(analysisStatus?.status === 'running' || analysisStatus?.status === 'queued') && analysisStatus.total_files > 0 && (
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-primary-500 transition-all"
                style={{ width: `${(analysisStatus.analyzed / analysisStatus.total_files) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Components section */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Box className="h-5 w-5 text-primary-500" />
              <div>
                <h3 className="font-medium text-slate-900">Source Components</h3>
                {componentCount > 0 ? (
                  <p className="text-sm text-slate-500">
                    {componentCount} component{componentCount !== 1 ? 's' : ''}
                    {Object.keys(complexitySummary).length > 0 && (
                      <span className="ml-1">
                        ({Object.entries(complexitySummary).map(([k, v]) => `${v} ${k}`).join(', ')})
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No components detected yet</p>
                )}
              </div>
            </div>
            {componentCount > 0 && (
              <Link href={`/projects/${projectId}/components`} className="btn-secondary text-sm">
                View Components
              </Link>
            )}
          </div>
        </div>

        {/* Mappings section */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch className="h-5 w-5 text-primary-500" />
              <div>
                <h3 className="font-medium text-slate-900">Mappings</h3>
                {mappingTotal > 0 ? (
                  <p className="text-sm text-slate-500">
                    {mappingConfirmed}/{mappingTotal} confirmed
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No mappings created yet</p>
                )}
              </div>
            </div>
            <Link href={`/projects/${projectId}/mappings`} className="btn-secondary text-sm">
              Manage Mappings
            </Link>
          </div>
        </div>

        {/* Generated Code section */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code2 className="h-5 w-5 text-primary-500" />
              <div>
                <h3 className="font-medium text-slate-900">Generated Code</h3>
                {generatedTotal > 0 ? (
                  <p className="text-sm text-slate-500">
                    {generatedPassed}/{generatedTotal} passed validation
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No code generated yet</p>
                )}
              </div>
            </div>
            <Link href={`/projects/${projectId}/generated`} className="btn-secondary text-sm">
              View Generated
            </Link>
          </div>
        </div>

        {/* Deploy section */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {deployStatus?.status === 'deploying' ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              ) : deployStatus?.status === 'completed' || deployStatus?.status === 'deployed' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : deployStatus?.status === 'failed' ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Rocket className="h-5 w-5 text-primary-500" />
              )}
              <div>
                <h3 className="font-medium text-slate-900">Deploy to IRIS</h3>
                {deployStatus?.status === 'deploying' ? (
                  <p className="text-sm text-blue-600 animate-pulse">
                    Deploying... ({deployStatus.deployed}/{deployStatus.total_classes} classes)
                  </p>
                ) : deployStatus?.status === 'completed' || deployStatus?.status === 'deployed' ? (
                  <p className="text-sm text-green-600">
                    Last deploy: {deployStatus.deployed} deployed
                    {deployStatus.failed > 0 && `, ${deployStatus.failed} failed`}
                  </p>
                ) : deployStatus?.status === 'failed' ? (
                  <p className="text-sm text-red-600">Last deployment failed</p>
                ) : deployHistory.length > 0 ? (
                  <p className="text-sm text-slate-500">
                    {deployHistory.length} previous deployment{deployHistory.length !== 1 ? 's' : ''}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Not deployed yet</p>
                )}
              </div>
            </div>
            <Link href={`/projects/${projectId}/deploy`} className="btn-primary text-sm">
              <Rocket className="mr-1.5 h-4 w-4" />
              Deploy
            </Link>
          </div>
          {deployStatus?.status === 'deploying' && deployStatus.total_classes > 0 && (
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all animate-pulse"
                style={{ width: `${((deployStatus.deployed + deployStatus.failed) / deployStatus.total_classes) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Testing section */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-primary-500" />
              <div>
                <h3 className="font-medium text-slate-900">Testing</h3>
                {testTotal > 0 ? (
                  <p className="text-sm text-slate-500">
                    {testTotal} test case{testTotal !== 1 ? 's' : ''}
                    {testResultsSummary && testResultsSummary.total > 0 && (
                      <span className="ml-1">
                        — Last run:
                        <span className="ml-1 text-emerald-600">{testResultsSummary.passed} passed</span>
                        {testResultsSummary.failed > 0 && (
                          <span className="ml-1 text-red-600">{testResultsSummary.failed} failed</span>
                        )}
                        {testResultsSummary.errors > 0 && (
                          <span className="ml-1 text-amber-600">{testResultsSummary.errors} errors</span>
                        )}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No test cases created yet</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {testResultsSummary && testResultsSummary.total > 0 && (
                <Link href={`/projects/${projectId}/tests/results`} className="btn-secondary text-sm">
                  View Results
                </Link>
              )}
              <Link href={`/projects/${projectId}/tests`} className="btn-primary text-sm">
                <FlaskConical className="mr-1.5 h-4 w-4" />
                Run Tests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
