'use client'

import Link from 'next/link'
import { Box, Plug, Globe, MessageSquare } from 'lucide-react'

interface ComponentCardProps {
  projectId: string
  component: {
    id: string
    name: string
    component_type: string
    complexity: string
    status: string
    exposed_services: unknown[] | null
    external_references: unknown[] | null
    hl7_messages: unknown[] | null
  }
}

const typeLabels: Record<string, string> = {
  mirth_channel: 'Mirth Channel',
  soa_composite: 'SOA Composite',
  diagram_analysis: 'Diagram',
  osb_proxy: 'OSB Proxy',
  bpel_process: 'BPEL Process',
  rhapsody_route: 'Rhapsody Route',
  biztalk_orchestration: 'BizTalk Orchestration',
}

const typeColors: Record<string, string> = {
  mirth_channel: 'bg-teal-100 text-teal-700',
  soa_composite: 'bg-blue-100 text-blue-700',
  diagram_analysis: 'bg-purple-100 text-purple-700',
  osb_proxy: 'bg-indigo-100 text-indigo-700',
  bpel_process: 'bg-cyan-100 text-cyan-700',
  rhapsody_route: 'bg-amber-100 text-amber-700',
  biztalk_orchestration: 'bg-rose-100 text-rose-700',
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

export default function ComponentCard({ projectId, component }: ComponentCardProps) {
  const servicesCount = component.exposed_services?.length ?? 0
  const referencesCount = component.external_references?.length ?? 0
  const hl7Count = component.hl7_messages?.length ?? 0

  return (
    <Link
      href={`/projects/${projectId}/components/${component.id}`}
      className="card block transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-semibold text-slate-900">{component.name}</h3>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            statusColors[component.status] || statusColors.pending
          }`}
        >
          {component.status}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            typeColors[component.component_type] || 'bg-slate-100 text-slate-600'
          }`}
        >
          {typeLabels[component.component_type] || component.component_type}
        </span>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            complexityColors[component.complexity] || complexityColors.low
          }`}
        >
          {component.complexity}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        {servicesCount > 0 && (
          <span className="flex items-center gap-1">
            <Plug className="h-3.5 w-3.5" />
            {servicesCount} service{servicesCount !== 1 ? 's' : ''}
          </span>
        )}
        {referencesCount > 0 && (
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
            {referencesCount} ref{referencesCount !== 1 ? 's' : ''}
          </span>
        )}
        {hl7Count > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {hl7Count} HL7
          </span>
        )}
        {servicesCount === 0 && referencesCount === 0 && hl7Count === 0 && (
          <span className="flex items-center gap-1">
            <Box className="h-3.5 w-3.5" />
            No details yet
          </span>
        )}
      </div>
    </Link>
  )
}
