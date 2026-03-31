'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight, Plug, Globe, MessageSquare, Layers } from 'lucide-react'
import { api } from '@/lib/api'

interface ExposedService {
  name: string
  type: string
  port?: number | string
  protocol?: string
}

interface ExternalReference {
  name: string
  url: string
  type: string
}

interface HL7Message {
  type: string
  direction: string
  version: string
}

interface IRISMapping {
  BS?: Array<{ name: string; description?: string }>
  BP?: Array<{ name: string; description?: string }>
  BO?: Array<{ name: string; description?: string }>
  DTL?: Array<{ name: string; description?: string }>
  MSG?: Array<{ name: string; description?: string }>
}

interface ComponentDetail {
  id: string
  project_id: string
  name: string
  component_type: string
  complexity: string
  status: string
  exposed_services: ExposedService[] | null
  external_references: ExternalReference[] | null
  hl7_messages: HL7Message[] | null
  analysis_result: {
    proposed_iris_mapping?: IRISMapping
    [key: string]: unknown
  } | null
  created_at: string
}

const typeColors: Record<string, string> = {
  mirth_channel: 'bg-teal-100 text-teal-700',
  soa_composite: 'bg-blue-100 text-blue-700',
  diagram_analysis: 'bg-purple-100 text-purple-700',
  osb_proxy: 'bg-indigo-100 text-indigo-700',
  bpel_process: 'bg-cyan-100 text-cyan-700',
}

const complexityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  very_high: 'bg-red-100 text-red-700',
}

const statusColors: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  analyzed: 'bg-green-100 text-green-700',
  analyzing: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
}

function IRISMappingSection({ mapping }: { mapping: IRISMapping }) {
  const sections: Array<{ key: keyof IRISMapping; label: string; color: string }> = [
    { key: 'BS', label: 'Business Services (BS)', color: 'text-teal-600' },
    { key: 'BP', label: 'Business Processes (BP)', color: 'text-blue-600' },
    { key: 'BO', label: 'Business Operations (BO)', color: 'text-purple-600' },
    { key: 'DTL', label: 'Data Transformations (DTL)', color: 'text-cyan-600' },
    { key: 'MSG', label: 'Message Classes (MSG)', color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, color }) => {
        const items = mapping[key]
        if (!items || items.length === 0) return null
        return (
          <div key={key}>
            <h4 className={`mb-2 text-sm font-semibold ${color}`}>{label}</h4>
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-slate-500">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ComponentDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const componentId = params.cid as string

  const [component, setComponent] = useState<ComponentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rawExpanded, setRawExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getComponent(projectId, componentId)
        setComponent(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load component')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, componentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-slate-500">Loading component...</p>
        </div>
      </div>
    )
  }

  if (error || !component) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error || 'Component not found'}
        </div>
        <Link
          href={`/projects/${projectId}/components`}
          className="btn-secondary mt-4"
        >
          Back to components
        </Link>
      </div>
    )
  }

  const services = component.exposed_services || []
  const references = component.external_references || []
  const hl7 = component.hl7_messages || []
  const irisMapping = component.analysis_result?.proposed_iris_mapping

  return (
    <div>
      <Link
        href={`/projects/${projectId}/components`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to components
      </Link>

      {/* Header */}
      <div className="card mb-6">
        <div className="mb-3 flex items-start justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{component.name}</h1>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              statusColors[component.status] || statusColors.pending
            }`}
          >
            {component.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              typeColors[component.component_type] || 'bg-slate-100 text-slate-600'
            }`}
          >
            {component.component_type}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              complexityColors[component.complexity] || complexityColors.low
            }`}
          >
            {component.complexity} complexity
          </span>
        </div>
      </div>

      {/* Exposed Services */}
      {services.length > 0 && (
        <div className="card mb-4">
          <div className="mb-3 flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              Exposed Services ({services.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 pr-4 font-medium text-slate-500">Name</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">Type</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">Port</th>
                  <th className="pb-2 font-medium text-slate-500">Protocol</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-700">{svc.name}</td>
                    <td className="py-2 pr-4 text-slate-600">{svc.type}</td>
                    <td className="py-2 pr-4 text-slate-600">{svc.port || '-'}</td>
                    <td className="py-2 text-slate-600">{svc.protocol || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* External References */}
      {references.length > 0 && (
        <div className="card mb-4">
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              External References ({references.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 pr-4 font-medium text-slate-500">Name</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">URL</th>
                  <th className="pb-2 font-medium text-slate-500">Type</th>
                </tr>
              </thead>
              <tbody>
                {references.map((ref, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-700">{ref.name}</td>
                    <td className="py-2 pr-4 text-slate-600">
                      <span className="max-w-xs truncate block">{ref.url}</span>
                    </td>
                    <td className="py-2 text-slate-600">{ref.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HL7 Messages */}
      {hl7.length > 0 && (
        <div className="card mb-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              HL7 Messages ({hl7.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 pr-4 font-medium text-slate-500">Type</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">Direction</th>
                  <th className="pb-2 font-medium text-slate-500">Version</th>
                </tr>
              </thead>
              <tbody>
                {hl7.map((msg, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-700">{msg.type}</td>
                    <td className="py-2 pr-4 text-slate-600">{msg.direction}</td>
                    <td className="py-2 text-slate-600">{msg.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proposed IRIS Mapping */}
      {irisMapping && (
        <div className="card mb-4">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-slate-900">Proposed IRIS Mapping</h2>
          </div>
          <IRISMappingSection mapping={irisMapping} />
        </div>
      )}

      {/* Raw Analysis JSON */}
      {component.analysis_result && (
        <div className="card mb-4">
          <button
            onClick={() => setRawExpanded(!rawExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-slate-900">Raw Analysis</h2>
            {rawExpanded ? (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {rawExpanded && (
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
              {JSON.stringify(component.analysis_result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
