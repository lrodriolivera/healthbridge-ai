'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, History, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import DeployWizard from '@/components/deploy-wizard'

interface HistoryItem {
  deployed_at: string
  iris_connection_name: string
  namespace: string
  total_classes: number
  successful: number
  failed: number
  status: string
}

const statusBadge: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  deployed: 'bg-green-100 text-green-700',
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  deploying: 'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DeployPage() {
  const params = useParams()
  const projectId = params.id as string

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [projectId])

  async function loadHistory() {
    try {
      setLoadingHistory(true)
      const data = await api.getDeployHistory(projectId)
      setHistory(data.items || [])
    } catch {
      // No history yet
    } finally {
      setLoadingHistory(false)
    }
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Deploy to IRIS</h1>
        <p className="mt-1 text-sm text-slate-500">
          Deploy generated ObjectScript classes to your InterSystems IRIS instance
        </p>
      </div>

      <DeployWizard projectId={projectId} />

      {/* Deploy History */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Deploy History</h2>
        </div>

        {loadingHistory ? (
          <div className="card flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="card text-sm text-slate-500">
            No deployments yet. Use the wizard above to deploy your first set of classes.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Connection</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Namespace</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Classes</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Result</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.deployed_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.iris_connection_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.namespace}</td>
                    <td className="px-4 py-3 text-slate-600">{item.total_classes}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.successful > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            {item.successful}
                          </span>
                        )}
                        {item.failed > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {item.failed}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[item.status] || 'bg-slate-100 text-slate-600'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
