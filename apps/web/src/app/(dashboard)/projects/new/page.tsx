'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'

const platforms = [
  { value: 'mirth_connect', label: 'Mirth Connect' },
  { value: 'oracle_soa', label: 'Oracle SOA/OSB' },
  { value: 'rhapsody', label: 'Rhapsody' },
  { value: 'cloverleaf', label: 'Cloverleaf' },
  { value: 'biztalk', label: 'BizTalk' },
  { value: 'other', label: 'Other' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sourcePlatform, setSourcePlatform] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.createProject({
        name,
        description: description || undefined,
        source_platform: sourcePlatform,
      })
      router.push('/projects')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <div className="mx-auto max-w-xl">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">New Project</h1>
        <p className="mb-8 text-sm text-slate-500">
          Set up a new integration migration project
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Project name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g., ADT Migration Phase 1"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Description
              <span className="ml-1 font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              placeholder="Describe the scope of this migration..."
            />
          </div>

          <div>
            <label
              htmlFor="platform"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Source platform
            </label>
            <select
              id="platform"
              required
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value)}
              className="input-field"
            >
              <option value="" disabled>
                Select the source platform
              </option>
              {platforms.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/projects" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </span>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
