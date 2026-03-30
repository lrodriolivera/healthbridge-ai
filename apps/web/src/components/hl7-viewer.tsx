'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface HL7ViewerProps {
  message: string
  title?: string
  compact?: boolean
}

const segmentColors: Record<string, string> = {
  MSH: 'bg-blue-100 text-blue-700 border-blue-200',
  PID: 'bg-green-100 text-green-700 border-green-200',
  PV1: 'bg-purple-100 text-purple-700 border-purple-200',
  PV2: 'bg-purple-50 text-purple-600 border-purple-200',
  EVN: 'bg-orange-100 text-orange-700 border-orange-200',
  OBR: 'bg-teal-100 text-teal-700 border-teal-200',
  OBX: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  MSA: 'bg-red-100 text-red-700 border-red-200',
  NK1: 'bg-pink-100 text-pink-700 border-pink-200',
  IN1: 'bg-amber-100 text-amber-700 border-amber-200',
  DG1: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  AL1: 'bg-rose-100 text-rose-700 border-rose-200',
  ERR: 'bg-red-100 text-red-700 border-red-200',
}

const defaultColor = 'bg-slate-100 text-slate-600 border-slate-200'

function getSegmentColor(name: string): string {
  return segmentColors[name] || defaultColor
}

export default function HL7Viewer({ message, title, compact = false }: HL7ViewerProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set())

  const lines = message
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  function toggleSegment(index: number) {
    setExpandedSegments((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-400 font-mono">
        No HL7 message content
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {title && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
          <h4 className="text-sm font-medium text-slate-700">{title}</h4>
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {lines.map((line, index) => {
          const segName = line.substring(0, 3)
          const colorClass = getSegmentColor(segName)
          const isExpanded = expandedSegments.has(index)
          const fields = line.split('|')

          return (
            <div key={index}>
              <button
                onClick={() => toggleSegment(index)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                )}
                <span
                  className={`inline-flex rounded px-1.5 py-0.5 text-xs font-bold border ${colorClass} shrink-0`}
                >
                  {segName}
                </span>
                {!compact && (
                  <span className="font-mono text-xs text-slate-500 truncate">
                    {line.length > 120 ? line.substring(0, 120) + '...' : line}
                  </span>
                )}
              </button>
              {isExpanded && (
                <div className="bg-slate-50 px-4 py-2 ml-8 mr-2 mb-2 rounded-lg border border-slate-200">
                  <div className="space-y-1">
                    {fields.map((field, fIdx) => (
                      <div key={fIdx} className="flex gap-2 text-xs">
                        <span className="font-mono text-slate-400 shrink-0 w-16 text-right">
                          {segName}-{fIdx}:
                        </span>
                        <span className="font-mono text-slate-700 break-all">
                          {field || <span className="text-slate-300">(empty)</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
