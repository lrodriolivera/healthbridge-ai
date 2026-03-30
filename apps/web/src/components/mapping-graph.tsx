'use client'

import { useState, useEffect, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  ConnectionMode,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { api } from '@/lib/api'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface MappingGraphProps {
  projectId: string
  onRefresh?: () => void
}

const layerColors: Record<string, { bg: string; border: string; text: string }> = {
  BS: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  BP: { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a5f' },
  BO: { bg: '#f5f3ff', border: '#8b5cf6', text: '#4c1d95' },
  DTL: { bg: '#fffbeb', border: '#f59e0b', text: '#78350f' },
  MSG: { bg: '#f8fafc', border: '#64748b', text: '#334155' },
}

function SourceNode({ data }: { data: any }) {
  return (
    <div
      className="rounded-lg border-2 px-4 py-3 shadow-sm"
      style={{
        background: '#f0fdfa',
        borderColor: '#14b8a6',
        minWidth: 180,
      }}
    >
      <div className="text-xs font-medium text-teal-600 mb-1">{data.type || 'Source'}</div>
      <div className="text-sm font-semibold text-slate-800">{data.label}</div>
    </div>
  )
}

function TargetNode({ data }: { data: any }) {
  const colors = layerColors[data.iris_layer] || layerColors.MSG
  return (
    <div
      className="rounded-lg border-2 px-4 py-3 shadow-sm"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        minWidth: 200,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded"
          style={{ background: colors.border + '20', color: colors.text }}
        >
          {data.iris_layer || data.target_type}
        </span>
        {data.confirmed && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>
      <div className="text-sm font-semibold" style={{ color: colors.text }}>
        {data.label}
      </div>
      <div className="text-xs mt-0.5" style={{ color: colors.text + 'aa' }}>
        {data.target_type}
      </div>
    </div>
  )
}

const nodeTypes = {
  source: SourceNode,
  target: TargetNode,
}

export default function MappingGraph({ projectId, onRefresh }: MappingGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadGraph = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getMappingGraph(projectId)
      const mappedNodes = (data.nodes || []).map((n: any) => ({
        ...n,
        type: n.type || (n.data?.iris_layer ? 'target' : 'source'),
      }))
      setNodes(mappedNodes)
      setEdges(
        (data.edges || []).map((e: any) => ({
          ...e,
          animated: !e.data?.confirmed,
          style: e.data?.confirmed
            ? { stroke: '#14b8a6', strokeWidth: 2 }
            : { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '6 3' },
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          <p className="text-sm text-slate-500">Loading mapping graph...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px] rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={loadGraph} className="btn-secondary text-xs mt-1">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] rounded-xl border border-dashed border-slate-300 bg-slate-50">
        <p className="text-sm text-slate-400">No mappings to visualize yet</p>
      </div>
    )
  }

  return (
    <div className="h-[450px] rounded-xl border border-slate-200 bg-white overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
