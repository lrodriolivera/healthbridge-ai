'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Check, X, Circle,
  Code, FileText, GitBranch, Layers, Wand2, Zap, Loader2, ExternalLink,
  Clock, AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HL7Field {
  id: string
  name: string
  type: string
}

interface HL7Segment {
  segment: string
  fields: HL7Field[]
}

interface HL7Message {
  type: string
  direction: string
  version: string
}

interface Transformation {
  transformation: string
  type: string
  description: string
  source_fields: string[]
}

interface SourceService {
  name: string
  type: string
  port?: number
}

interface ExternalRef {
  name: string
  url: string
  type: string
}

interface TargetClass {
  mapping_id: string
  class_name: string
  target_type: string
  iris_layer: string
  extends: string
  confirmed: boolean
  generated: boolean
  validation_status: string // 'passed' | 'failed' | 'not_generated'
}

interface ComponentData {
  component_id: string
  name: string
  component_type: string
  complexity: string
  description: string
  hl7_messages: HL7Message[]
  hl7_segments: HL7Segment[]
  transformations: Transformation[]
  business_logic: string
  source_services: SourceService[]
  external_references: ExternalRef[]
  target_classes: TargetClass[]
}

interface FieldMappingsResponse {
  components: ComponentData[]
  code_previews: Record<string, string>
  summary: {
    total_components: number
    total_mappings: number
    confirmed_mappings: number
    generated_classes: number
    passed_classes: number
  }
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const segmentColors: Record<string, string> = {
  MSH: 'border-blue-500 bg-blue-50 text-blue-700',
  PID: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  PV1: 'border-purple-500 bg-purple-50 text-purple-700',
  PV2: 'border-purple-400 bg-purple-50 text-purple-600',
  EVN: 'border-orange-500 bg-orange-50 text-orange-700',
  ORC: 'border-teal-500 bg-teal-50 text-teal-700',
  OBR: 'border-cyan-500 bg-cyan-50 text-cyan-700',
  FT1: 'border-amber-500 bg-amber-50 text-amber-700',
}

const segmentBorderOnly: Record<string, string> = {
  MSH: 'border-l-blue-500',
  PID: 'border-l-emerald-500',
  PV1: 'border-l-purple-500',
  PV2: 'border-l-purple-400',
  EVN: 'border-l-orange-500',
  ORC: 'border-l-teal-500',
  OBR: 'border-l-cyan-500',
  FT1: 'border-l-amber-500',
}

const layerBadge: Record<string, string> = {
  BS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  BP: 'bg-blue-100 text-blue-700 border-blue-200',
  BO: 'bg-purple-100 text-purple-700 border-purple-200',
  DTL: 'bg-amber-100 text-amber-700 border-amber-200',
  MSG: 'bg-slate-100 text-slate-600 border-slate-200',
}

const complexityBadge: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

const LAYER_ORDER = ['MSG', 'BO', 'BP', 'BS', 'DTL']

const segmentDescriptions: Record<string, string> = {
  MSH: 'Message Header',
  PID: 'Patient Identification',
  PV1: 'Patient Visit',
  PV2: 'Patient Visit - Additional',
  EVN: 'Event Type',
  ORC: 'Common Order',
  OBR: 'Observation Request',
  FT1: 'Financial Transaction',
  NK1: 'Next of Kin',
  IN1: 'Insurance',
  AL1: 'Allergy',
  DG1: 'Diagnosis',
  GT1: 'Guarantor',
  ZPD: 'Custom Segment',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MappingsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [data, setData] = useState<FieldMappingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Expandable state per component
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set())
  // Expandable code previews per mapping_id
  const [expandedCode, setExpandedCode] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.getFieldMappings(projectId)
      setData(result)
      // Auto-expand first component
      if (result.components?.length > 0) {
        setExpandedComponents(new Set([result.components[0].component_id]))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load field mappings')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function toggleComponent(id: string) {
    setExpandedComponents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleCode(id: string) {
    setExpandedCode((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAutoGenerate() {
    setActionLoading('auto-generate')
    setError('')
    try {
      await api.autoGenerateMappings(projectId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-generate mappings')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleGenerateAll() {
    setActionLoading('generate-all')
    setError('')
    try {
      await api.generateAll(projectId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start code generation')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleConfirm(mappingId: string) {
    setActionLoading(mappingId)
    try {
      await api.confirmMapping(projectId, mappingId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm mapping')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleGenerateSingle(mappingId: string) {
    setActionLoading(mappingId)
    try {
      await api.generateSingle(projectId, mappingId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code')
    } finally {
      setActionLoading(null)
    }
  }

  // Helpers
  const summary = data?.summary
  const components = data?.components || []
  const codePreviews = data?.code_previews || {}

  function getUsedFields(comp: ComponentData): Set<string> {
    const s = new Set<string>()
    comp.transformations.forEach((t) => t.source_fields.forEach((f) => s.add(f)))
    return s
  }

  function groupClassesByLayer(classes: TargetClass[]): Record<string, TargetClass[]> {
    const grouped: Record<string, TargetClass[]> = {}
    for (const layer of LAYER_ORDER) {
      const inLayer = classes.filter((c) => c.iris_layer === layer)
      if (inLayer.length > 0) grouped[layer] = inLayer
    }
    // Any remaining layers not in LAYER_ORDER
    classes.forEach((c) => {
      if (!LAYER_ORDER.includes(c.iris_layer)) {
        if (!grouped[c.iris_layer]) grouped[c.iris_layer] = []
        grouped[c.iris_layer].push(c)
      }
    })
    return grouped
  }

  function buildProductionFlow(classes: TargetClass[]): string[] {
    const lines: string[] = []
    const bs = classes.filter((c) => c.iris_layer === 'BS')
    const bp = classes.filter((c) => c.iris_layer === 'BP')
    const bo = classes.filter((c) => c.iris_layer === 'BO')

    bs.forEach((s) => {
      lines.push(s.class_name + ` (${s.extends.replace('EnsLib.', '').replace('Ens.', '')})`)
    })
    bp.forEach((p) => {
      lines.push('  -> ' + p.class_name + ` (${p.target_type})`)
    })
    bo.forEach((o) => {
      lines.push('    -> ' + o.class_name + ` (${o.extends.replace('EnsLib.', '').replace('Ens.', '')})`)
    })
    return lines
  }

  function parseBusinessLogic(text: string): string[] {
    if (!text) return []
    // Split by numbered steps: "1. ... 2. ... 3. ..."
    const parts = text.split(/(?=\d+\.\s)/).filter(Boolean)
    return parts.map((p) => p.trim())
  }

  function getValidationDot(status: string) {
    if (status === 'passed') return <Circle className="h-3 w-3 fill-green-500 text-green-500" />
    if (status === 'failed') return <Circle className="h-3 w-3 fill-red-500 text-red-500" />
    return <Circle className="h-3 w-3 fill-slate-300 text-slate-300" />
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* Navigation */}
      <Link
        href={`/projects/${projectId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Field-Level Mappings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Source HL7 structure, transformations, and target IRIS class mappings
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : !data || components.length === 0 ? (
        <div className="card text-center py-16">
          <Layers className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium mb-1">No field mappings available</p>
          <p className="text-sm text-slate-400 mb-6">
            Upload source files and run analysis first, then auto-generate mappings.
          </p>
          <button
            onClick={handleAutoGenerate}
            disabled={actionLoading === 'auto-generate'}
            className="btn-primary text-sm"
          >
            {actionLoading === 'auto-generate' ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Wand2 className="h-4 w-4" /> Auto-Generate Mappings
              </span>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* ========== Summary Header ========== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                <Layers className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary?.total_components ?? 0}</p>
                <p className="text-xs text-slate-500">Components</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <GitBranch className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {summary?.confirmed_mappings ?? 0}
                  <span className="text-sm font-normal text-slate-400">/{summary?.total_mappings ?? 0}</span>
                </p>
                <p className="text-xs text-slate-500">Mappings confirmed</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Code className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {summary?.passed_classes ?? 0}
                  <span className="text-sm font-normal text-slate-400">/{summary?.generated_classes ?? 0}</span>
                </p>
                <p className="text-xs text-slate-500">Classes passed</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={handleAutoGenerate}
              disabled={actionLoading === 'auto-generate'}
              className="btn-secondary text-sm"
            >
              {actionLoading === 'auto-generate' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Wand2 className="h-4 w-4" /> Auto-Generate Mappings
                </span>
              )}
            </button>
            <button
              onClick={handleGenerateAll}
              disabled={actionLoading === 'generate-all'}
              className="btn-primary text-sm"
            >
              {actionLoading === 'generate-all' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating code...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4" /> Generate All Code
                </span>
              )}
            </button>
          </div>

          {/* ========== Component Sections ========== */}
          <div className="space-y-4">
            {components.map((comp) => {
              const isExpanded = expandedComponents.has(comp.component_id)
              const usedFields = getUsedFields(comp)
              const groupedClasses = groupClassesByLayer(comp.target_classes)
              const productionFlow = buildProductionFlow(comp.target_classes)
              const logicSteps = parseBusinessLogic(comp.business_logic)

              return (
                <div key={comp.component_id} className="card p-0 overflow-hidden">
                  {/* Component Header (clickable) */}
                  <button
                    onClick={() => toggleComponent(comp.component_id)}
                    className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold text-slate-900 truncate">{comp.name}</h2>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {comp.component_type.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${complexityBadge[comp.complexity] || complexityBadge.medium}`}>
                          {comp.complexity}
                        </span>
                      </div>
                      {comp.description && (
                        <p className="mt-0.5 text-sm text-slate-500 truncate">{comp.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs text-slate-400">
                      <span>{comp.hl7_messages.length} msg{comp.hl7_messages.length !== 1 ? 's' : ''}</span>
                      <span>{comp.target_classes.length} class{comp.target_classes.length !== 1 ? 'es' : ''}</span>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      {/* Three-column layout: Source | Transformation | Target */}
                      <div className="flex flex-col lg:flex-row">
                        {/* ===== SOURCE PANEL (left ~40%) ===== */}
                        <div className="lg:w-[40%] border-b lg:border-b-0 lg:border-r border-slate-100 p-5">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                            Source HL7 Structure
                          </h3>

                          {/* Services */}
                          {comp.source_services.length > 0 && (
                            <div className="mb-4">
                              {comp.source_services.map((svc, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                  <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                                    {svc.type}
                                  </span>
                                  <span>{svc.name}</span>
                                  {svc.port && <span className="text-slate-400">:{svc.port}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* HL7 Messages and segments */}
                          {comp.hl7_messages.map((msg, mi) => (
                            <div key={mi} className="mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-teal-500" />
                                <span className="text-sm font-semibold text-slate-800">{msg.type}</span>
                                <span className="text-xs text-slate-400">
                                  ({msg.direction}, v{msg.version})
                                </span>
                              </div>

                              {/* Segments tree */}
                              <div className="space-y-1 ml-2">
                                {comp.hl7_segments.map((seg) => {
                                  const borderColor = segmentBorderOnly[seg.segment] || 'border-l-slate-300'
                                  return (
                                    <div
                                      key={seg.segment}
                                      className={`border-l-4 ${borderColor} rounded-r-md bg-white`}
                                    >
                                      {/* Segment header */}
                                      <div className="flex items-center gap-2 px-3 py-1.5">
                                        <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-bold ${segmentColors[seg.segment] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                                          {seg.segment}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {segmentDescriptions[seg.segment] || seg.segment}
                                        </span>
                                      </div>
                                      {/* Fields */}
                                      <div className="pl-6 pr-3 pb-1.5">
                                        {seg.fields.map((field) => {
                                          const isUsed = usedFields.has(field.id)
                                          return (
                                            <div
                                              key={field.id}
                                              className={`flex items-baseline gap-2 py-0.5 text-xs rounded px-1.5 ${
                                                isUsed
                                                  ? 'bg-teal-50 font-semibold text-teal-800'
                                                  : 'text-slate-500'
                                              }`}
                                            >
                                              <code className={`font-mono ${isUsed ? 'text-teal-700' : 'text-slate-400'}`}>
                                                {field.id}
                                              </code>
                                              <span>{field.name}</span>
                                              {field.type && field.type !== '|' && (
                                                <span className="text-slate-400">[{field.type}]</span>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ===== TRANSFORMATION ARROW (center ~20%) ===== */}
                        <div className="lg:w-[20%] border-b lg:border-b-0 lg:border-r border-slate-100 p-5 flex flex-col items-center justify-start">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 self-start">
                            Transformations
                          </h3>

                          {comp.transformations.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No transformations</p>
                          ) : (
                            <div className="space-y-4 w-full">
                              {comp.transformations.map((tx, ti) => (
                                <div key={ti} className="relative">
                                  {/* Arrow visualization */}
                                  <div className="flex items-center justify-center gap-2 mb-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-teal-300 to-teal-500" />
                                    <ArrowRight className="h-5 w-5 text-teal-500 shrink-0" />
                                    <div className="h-px flex-1 bg-gradient-to-r from-teal-500 to-teal-300" />
                                  </div>

                                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-center">
                                    <p className="text-xs font-semibold text-slate-700 truncate" title={tx.transformation}>
                                      {tx.transformation}
                                    </p>
                                    <span className="inline-flex rounded-full bg-cyan-100 text-cyan-700 px-2 py-0.5 text-[10px] font-medium mt-1">
                                      {tx.type}
                                    </span>
                                    {tx.description && (
                                      <p className="mt-1.5 text-[11px] text-slate-500 line-clamp-2">{tx.description}</p>
                                    )}
                                    {/* Source fields summary */}
                                    {tx.source_fields.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1 justify-center">
                                        {tx.source_fields.slice(0, 6).map((f) => (
                                          <code
                                            key={f}
                                            className="rounded bg-teal-100 px-1 py-0.5 text-[10px] font-mono text-teal-700"
                                          >
                                            {f}
                                          </code>
                                        ))}
                                        {tx.source_fields.length > 6 && (
                                          <span className="text-[10px] text-slate-400">
                                            +{tx.source_fields.length - 6} more
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Connecting lines (CSS) */}
                                  <div className="flex items-center justify-center mt-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-teal-300 to-emerald-300" />
                                    <ArrowRight className="h-4 w-4 text-emerald-400 shrink-0" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ===== TARGET PANEL (right ~40%) ===== */}
                        <div className="lg:w-[40%] p-5">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                            Target IRIS Classes
                          </h3>

                          {/* Classes grouped by layer */}
                          {Object.entries(groupedClasses).map(([layer, classes]) => (
                            <div key={layer} className="mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${layerBadge[layer] || layerBadge.MSG}`}>
                                  {layer}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {layer === 'BS' ? 'Business Service' : layer === 'BP' ? 'Business Process' : layer === 'BO' ? 'Business Operation' : layer === 'DTL' ? 'Data Transformation' : layer === 'MSG' ? 'Message Class' : layer}
                                </span>
                              </div>

                              <div className="space-y-2 ml-1">
                                {classes.map((cls) => (
                                  <div
                                    key={cls.mapping_id}
                                    className="rounded-lg border border-slate-200 bg-white overflow-hidden"
                                  >
                                    <div className="px-3 py-2.5 flex items-start gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 break-all leading-tight">
                                          {cls.class_name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          <span className="text-[11px] text-slate-400">
                                            extends <code className="font-mono">{cls.extends}</code>
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Validation status dot */}
                                        {getValidationDot(cls.validation_status)}

                                        {/* Confirmed badge */}
                                        {cls.confirmed ? (
                                          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                            <Check className="h-3 w-3" />
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => handleConfirm(cls.mapping_id)}
                                            disabled={actionLoading === cls.mapping_id}
                                            className="inline-flex items-center gap-0.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 hover:bg-yellow-200 transition-colors"
                                            title="Confirm mapping"
                                          >
                                            {actionLoading === cls.mapping_id ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <Clock className="h-3 w-3" />
                                            )}
                                          </button>
                                        )}

                                        {/* Generate single */}
                                        {cls.confirmed && !cls.generated && (
                                          <button
                                            onClick={() => handleGenerateSingle(cls.mapping_id)}
                                            disabled={actionLoading === cls.mapping_id}
                                            className="rounded p-1 text-teal-600 hover:bg-teal-50 transition-colors"
                                            title="Generate code"
                                          >
                                            {actionLoading === cls.mapping_id ? (
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                              <Zap className="h-3.5 w-3.5" />
                                            )}
                                          </button>
                                        )}

                                        {/* Code preview toggle */}
                                        {codePreviews[cls.mapping_id] && (
                                          <button
                                            onClick={() => toggleCode(cls.mapping_id)}
                                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                            title="View code"
                                          >
                                            <Code className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Code preview (expandable) */}
                                    {expandedCode.has(cls.mapping_id) && codePreviews[cls.mapping_id] && (
                                      <div className="border-t border-slate-100 bg-slate-900 px-4 py-3 overflow-x-auto">
                                        <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre">
                                          {codePreviews[cls.mapping_id]
                                            .split('\n')
                                            .slice(0, 20)
                                            .join('\n')}
                                        </pre>
                                        {codePreviews[cls.mapping_id].split('\n').length > 20 && (
                                          <p className="text-[10px] text-slate-500 mt-2">
                                            ... {codePreviews[cls.mapping_id].split('\n').length - 20} more lines
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* Production flow */}
                          {productionFlow.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-slate-100">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                IRIS Production Flow
                              </h4>
                              <div className="rounded-lg bg-slate-900 px-4 py-3">
                                <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre">
                                  {productionFlow.join('\n')}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ===== Business Logic Timeline ===== */}
                      {logicSteps.length > 0 && (
                        <div className="border-t border-slate-100 px-6 py-5">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                            Business Logic Flow
                          </h3>
                          <div className="relative pl-6">
                            {/* Timeline line */}
                            <div className="absolute left-2 top-1 bottom-1 w-px bg-teal-200" />
                            <div className="space-y-3">
                              {logicSteps.map((step, si) => (
                                <div key={si} className="relative flex items-start gap-3">
                                  {/* Dot on timeline */}
                                  <div className="absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-teal-400 bg-white" />
                                  <p className="text-sm text-slate-700">{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ===== External References ===== */}
                      {comp.external_references.length > 0 && (
                        <div className="border-t border-slate-100 px-6 py-5">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                            External References
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  <th className="pb-2 pr-4">Name</th>
                                  <th className="pb-2 pr-4">Type</th>
                                  <th className="pb-2">URL</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {comp.external_references.map((ref, ri) => (
                                  <tr key={ri}>
                                    <td className="py-1.5 pr-4 text-slate-700 font-medium">{ref.name}</td>
                                    <td className="py-1.5 pr-4">
                                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                        {ref.type}
                                      </span>
                                    </td>
                                    <td className="py-1.5">
                                      <a
                                        href={ref.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-teal-600 hover:text-teal-800 text-xs font-mono flex items-center gap-1 break-all"
                                      >
                                        {ref.url}
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
