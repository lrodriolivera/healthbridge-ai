'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { api } from '@/lib/api'

const platforms = [
  { value: 'mirth_connect', label: 'Mirth Connect', description: 'HL7 channels, TCP/MLLP' },
  { value: 'oracle_soa', label: 'Oracle SOA/OSB', description: 'BPEL, Mediator, adapters' },
  { value: 'rhapsody', label: 'Rhapsody', description: 'Routes, communication points' },
  { value: 'cloverleaf', label: 'Cloverleaf', description: 'Inbound/outbound threads' },
  { value: 'biztalk', label: 'BizTalk', description: 'Orchestrations, send/receive ports' },
  { value: 'other', label: 'Other', description: 'Custom or unsupported platform' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function togglePlatform(value: string) {
    setSelectedPlatforms(prev =>
      prev.includes(value)
        ? prev.filter(p => p !== value)
        : [...prev, value]
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (selectedPlatforms.length === 0) {
      setError('Select at least one source platform')
      return
    }

    setLoading(true)

    try {
      await api.createProject({
        name,
        description: description || undefined,
        source_platforms: selectedPlatforms,
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
              placeholder="e.g., UC CHRISTUS Migration"
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
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Source platforms
              <span className="ml-1 font-normal text-slate-400">(select all that apply)</span>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {platforms.map((p) => {
                const selected = selectedPlatforms.includes(p.value)
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                      selected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${
                        selected ? 'bg-teal-500' : 'border-2 border-slate-300'
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${selected ? 'text-teal-900' : 'text-slate-700'}`}>
                        {p.label}
                      </div>
                      <div className="text-xs text-slate-500">{p.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            {selectedPlatforms.length > 0 && (
              <p className="mt-2 text-xs text-teal-600">
                {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/projects" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={loading || selectedPlatforms.length === 0} className="btn-primary">
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
