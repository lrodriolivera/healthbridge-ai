'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Database, ArrowRightLeft, Box, Layers } from 'lucide-react'

// ─── Custom Node: Source (HL7/SOAP) ──────────────────────────────
function SourceNode({ data }: { data: any }) {
  return (
    <div className="rounded-xl border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-3 shadow-lg min-w-[200px]">
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <Database className="h-4 w-4 text-blue-600" />
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Source</span>
      </div>
      <div className="text-sm font-semibold text-slate-800">{data.name}</div>
      <div className="text-xs text-slate-500 mt-0.5">{data.type}</div>
      {data.messages && data.messages.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.messages.map((msg: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-mono text-blue-700">{msg.type || msg}</span>
              {msg.direction && (
                <span className="text-[10px] text-blue-400">({msg.direction})</span>
              )}
            </div>
          ))}
        </div>
      )}
      {data.segments && data.segments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.segments.map((seg: string, i: number) => (
            <span key={i} className="rounded bg-blue-200/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-blue-700">
              {seg}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Custom Node: Transformation ─────────────────────────────────
function TransformNode({ data }: { data: any }) {
  const typeColors: Record<string, string> = {
    XSL: 'border-amber-400 from-amber-50 to-amber-100',
    BPEL_Assign: 'border-orange-400 from-orange-50 to-orange-100',
    DTL: 'border-cyan-400 from-cyan-50 to-cyan-100',
    default: 'border-slate-400 from-slate-50 to-slate-100',
  }
  const color = typeColors[data.type] || typeColors.default
  const badgeColors: Record<string, string> = {
    XSL: 'bg-amber-100 text-amber-700',
    BPEL_Assign: 'bg-orange-100 text-orange-700',
    DTL: 'bg-cyan-100 text-cyan-700',
    default: 'bg-slate-100 text-slate-700',
  }
  const badge = badgeColors[data.type] || badgeColors.default

  return (
    <div className={`rounded-xl border-2 bg-gradient-to-br ${color} px-4 py-3 shadow-lg min-w-[180px] max-w-[220px]`}>
      <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <ArrowRightLeft className="h-4 w-4 text-amber-600" />
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>{data.type}</span>
      </div>
      <div className="text-xs font-semibold text-slate-800 leading-tight">{data.name}</div>
      {data.fields && data.fields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-0.5">
          {data.fields.slice(0, 8).map((f: string, i: number) => (
            <span key={i} className="rounded bg-white/60 px-1 py-0.5 text-[9px] font-mono text-slate-600">{f}</span>
          ))}
          {data.fields.length > 8 && (
            <span className="text-[9px] text-slate-400">+{data.fields.length - 8}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Custom Node: Target IRIS Class ──────────────────────────────
function TargetNode({ data }: { data: any }) {
  const layerColors: Record<string, string> = {
    BS: 'border-emerald-400 from-emerald-50 to-emerald-100',
    BP: 'border-blue-400 from-blue-50 to-blue-100',
    BO: 'border-purple-400 from-purple-50 to-purple-100',
    DTL: 'border-amber-400 from-amber-50 to-amber-100',
    MSG: 'border-slate-400 from-slate-50 to-slate-100',
  }
  const layerBadge: Record<string, string> = {
    BS: 'bg-emerald-100 text-emerald-700',
    BP: 'bg-blue-100 text-blue-700',
    BO: 'bg-purple-100 text-purple-700',
    DTL: 'bg-amber-100 text-amber-700',
    MSG: 'bg-slate-100 text-slate-700',
  }
  const color = layerColors[data.layer] || layerColors.MSG
  const badge = layerBadge[data.layer] || layerBadge.MSG

  return (
    <div className={`rounded-xl border-2 bg-gradient-to-br ${color} px-4 py-3 shadow-lg min-w-[220px]`}>
      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <Box className="h-4 w-4 text-purple-600" />
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>{data.layer}</span>
        {data.validation === 'passed' && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Validated" />}
        {data.validation === 'failed' && <span className="h-2 w-2 rounded-full bg-red-500" title="Failed" />}
        {!data.validation && <span className="h-2 w-2 rounded-full bg-slate-300" title="Not generated" />}
      </div>
      <div className="text-xs font-semibold text-slate-800">{data.className}</div>
      {data.extends && (
        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">extends {data.extends}</div>
      )}
      {data.confirmed && (
        <div className="mt-1 text-[10px] text-emerald-600 font-medium">✓ Confirmed</div>
      )}
    </div>
  )
}

// ─── Node types ──────────────────────────────────────────────────
const nodeTypes = {
  source: SourceNode,
  transform: TransformNode,
  target: TargetNode,
}

// ─── Main Component ──────────────────────────────────────────────
interface ComponentFlowDiagramProps {
  component: any
}

export default function ComponentFlowDiagram({ component }: ComponentFlowDiagramProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Source node
    const segments = (component.hl7_segments || []).map((s: any) => s.segment)
    nodes.push({
      id: 'source',
      type: 'source',
      position: { x: 0, y: 0 },
      data: {
        name: component.name,
        type: component.component_type === 'mirth_channel' ? 'Mirth Channel' : 'SOA Composite',
        messages: component.hl7_messages || [],
        segments: segments,
      },
    })

    // Transformation nodes
    const transforms = component.transformations || []
    const hasTransforms = transforms.length > 0

    if (hasTransforms) {
      transforms.forEach((t: any, i: number) => {
        const nodeId = `transform-${i}`
        nodes.push({
          id: nodeId,
          type: 'transform',
          position: { x: 320, y: i * 120 },
          data: {
            name: t.transformation,
            type: t.type,
            fields: t.source_fields || [],
          },
        })
        edges.push({
          id: `source-to-${nodeId}`,
          source: 'source',
          target: nodeId,
          animated: true,
          style: { stroke: '#f59e0b', strokeWidth: 2 },
        })
      })
    }

    // Target nodes grouped by layer order
    const layerOrder = ['MSG', 'BO', 'BP', 'BS', 'DTL']
    const targets = component.target_classes || []

    // Deduplicate by class_name
    const seen = new Set<string>()
    const uniqueTargets = targets.filter((t: any) => {
      if (seen.has(t.class_name)) return false
      seen.add(t.class_name)
      return true
    })

    // Sort by layer
    uniqueTargets.sort((a: any, b: any) => {
      return (layerOrder.indexOf(a.iris_layer) ?? 99) - (layerOrder.indexOf(b.iris_layer) ?? 99)
    })

    const targetX = hasTransforms ? 620 : 350

    uniqueTargets.forEach((t: any, i: number) => {
      const nodeId = `target-${i}`
      nodes.push({
        id: nodeId,
        type: 'target',
        position: { x: targetX, y: i * 90 },
        data: {
          className: t.class_name,
          layer: t.iris_layer,
          extends: t.extends,
          confirmed: t.confirmed,
          validation: t.validation_status,
        },
      })

      // Connect from transforms or source
      if (hasTransforms) {
        // Connect last transform to all targets
        const lastTransform = `transform-${transforms.length - 1}`
        edges.push({
          id: `${lastTransform}-to-${nodeId}`,
          source: lastTransform,
          target: nodeId,
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
        })
      } else {
        edges.push({
          id: `source-to-${nodeId}`,
          source: 'source',
          target: nodeId,
          animated: true,
          style: { stroke: '#14b8a6', strokeWidth: 2 },
        })
      }
    })

    // Adjust source Y to center vertically
    const totalTargetHeight = Math.max((uniqueTargets.length - 1) * 90, 0)
    const totalTransformHeight = Math.max((transforms.length - 1) * 120, 0)
    const maxHeight = Math.max(totalTargetHeight, totalTransformHeight)
    nodes[0].position.y = maxHeight / 2 - 40

    return { nodes, edges }
  }, [component])

  const height = Math.max(300, (nodes.length - 1) * 80 + 100)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ height: `${Math.min(height, 600)}px` }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        minZoom={0.5}
        maxZoom={1.2}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
