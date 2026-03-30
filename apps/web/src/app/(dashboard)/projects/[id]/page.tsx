'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, X, Check, Lock } from 'lucide-react'
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

function PlaceholderSection({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <Lock className="h-5 w-5 text-slate-300" />
        <div>
          <h3 className="font-medium text-slate-400">{title}</h3>
          <p className="text-sm text-slate-400">Coming in {phase}</p>
        </div>
      </div>
    </div>
  )
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

  useEffect(() => {
    loadProject()
  }, [projectId])

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

      {/* Pipeline sections (placeholders) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Migration Pipeline</h2>
        <PlaceholderSection title="Source Components" phase="Phase 1" />
        <PlaceholderSection title="Mappings" phase="Phase 2" />
        <PlaceholderSection title="Generated Code" phase="Phase 2" />
        <PlaceholderSection title="Validation Results" phase="Phase 3" />
        <PlaceholderSection title="Deployment" phase="Phase 4" />
        <PlaceholderSection title="Test Results" phase="Phase 5" />
      </div>
    </div>
  )
}
