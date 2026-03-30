'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'

interface Project {
  id: string
  name: string
  description: string | null
  source_platform: string
  status: string
  created_at: string
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      const data = await api.listProjects()
      setProjects(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-slate-500">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
        <button onClick={loadProjects} className="btn-secondary mt-4">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} migration {total === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Project grid */}
      {projects.length === 0 ? (
        <div className="card flex flex-col items-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
            <FolderOpen className="h-7 w-7 text-primary-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No projects yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first migration project to get started.
          </p>
          <Link href="/projects/new" className="btn-primary mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              className="card group text-left transition-all hover:border-primary-200 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <h3 className="font-semibold text-slate-900 group-hover:text-primary-700">
                  {project.name}
                </h3>
                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500" />
              </div>

              {project.description && (
                <p className="mb-4 line-clamp-2 text-sm text-slate-500">{project.description}</p>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    platformColors[project.source_platform] || platformColors.other
                  }`}
                >
                  {platformLabels[project.source_platform] || project.source_platform}
                </span>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    statusColors[project.status] || statusColors.created
                  }`}
                >
                  {project.status}
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-400">{formatDate(project.created_at)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
