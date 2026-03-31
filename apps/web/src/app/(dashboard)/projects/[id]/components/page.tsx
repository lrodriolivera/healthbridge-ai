'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Box, AlertTriangle, TrendingUp, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import ComponentCard from '@/components/component-card'

interface Component {
  id: string
  project_id: string
  name: string
  component_type: string
  complexity: string
  status: string
  exposed_services: unknown[] | null
  external_references: unknown[] | null
  hl7_messages: unknown[] | null
  created_at: string
}

export default function ComponentsListPage() {
  const params = useParams()
  const projectId = params.id as string

  const [components, setComponents] = useState<Component[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await api.listComponents(projectId, 0, 100)
        setComponents(data.items || [])
        setTotal(data.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load components')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  const complexityCounts = components.reduce(
    (acc, c) => {
      acc[c.complexity] = (acc[c.complexity] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-slate-500">Loading components...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link
        href={`/projects/${projectId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">Source Components</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card flex items-center gap-3">
          <Box className="h-8 w-8 text-primary-500" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Zap className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{complexityCounts.low || 0}</p>
            <p className="text-xs text-slate-500">Low</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-yellow-500" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{complexityCounts.medium || 0}</p>
            <p className="text-xs text-slate-500">Medium</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-orange-500" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{complexityCounts.high || 0}</p>
            <p className="text-xs text-slate-500">High</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-slate-900">{complexityCounts.very_high || 0}</p>
            <p className="text-xs text-slate-500">Very High</p>
          </div>
        </div>
      </div>

      {/* Components grid */}
      {components.length === 0 ? (
        <div className="card py-12 text-center">
          <Box className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">
            No components found. Upload source files and run analysis first.
          </p>
          <Link href={`/projects/${projectId}/uploads`} className="btn-primary mt-4 inline-flex">
            Go to Uploads
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {components.map((component) => (
            <ComponentCard
              key={component.id}
              projectId={projectId}
              component={component}
            />
          ))}
        </div>
      )}
    </div>
  )
}
