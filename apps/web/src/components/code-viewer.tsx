'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const Editor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] rounded-lg border border-slate-200 bg-slate-900">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400">Loading editor...</p>
        </div>
      </div>
    ),
  }
)

interface CodeViewerProps {
  code: string
  language?: string
  readOnly?: boolean
  height?: string
}

export default function CodeViewer({
  code,
  language = 'plaintext',
  readOnly = true,
  height = '500px',
}: CodeViewerProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-700" style={{ minHeight: '400px' }}>
      <Editor
        height={height}
        language={language}
        value={code}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'none',
          overviewRulerBorder: false,
        }}
      />
    </div>
  )
}
