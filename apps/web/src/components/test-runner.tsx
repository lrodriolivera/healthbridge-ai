'use client'

import { useState, useEffect } from 'react'
import {
  Play, Loader2, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, Clock, Zap,
} from 'lucide-react'
import { api } from '@/lib/api'
import HL7Viewer from '@/components/hl7-viewer'

interface Connection {
  id: string
  name: string
  host: string
  namespace: string
}

interface TestResult {
  id: string
  test_case_id: string
  status: string
  response_content: string | null
  response_time_ms: number | null
  ack_code: string | null
  error_message: string | null
  executed_at: string
}

interface TestRunnerProps {
  projectId: string
  testIds?: string[]
  testNames?: Record<string, { name: string; protocol: string }>
  onComplete?: () => void
}

const statusIcon: Record<string, typeof CheckCircle> = {
  pass: CheckCircle,
  passed: CheckCircle,
  fail: XCircle,
  failed: XCircle,
  error: AlertTriangle,
}

const statusColor: Record<string, string> = {
  pass: 'text-emerald-600',
  passed: 'text-emerald-600',
  fail: 'text-red-600',
  failed: 'text-red-600',
  error: 'text-amber-600',
}

const statusBadge: Record<string, string> = {
  pass: 'bg-emerald-100 text-emerald-700',
  passed: 'bg-emerald-100 text-emerald-700',
  fail: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  error: 'bg-amber-100 text-amber-700',
}

const ackColor: Record<string, string> = {
  AA: 'text-green-600',
  AE: 'text-orange-600',
  AR: 'text-red-600',
}

const protocolBadge: Record<string, string> = {
  mllp: 'bg-blue-100 text-blue-700',
  http: 'bg-teal-100 text-teal-700',
  soap: 'bg-purple-100 text-purple-700',
}

export default function TestRunner({ projectId, testIds, testNames, onComplete }: TestRunnerProps) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedConnection, setSelectedConnection] = useState('')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ completed: 0, total: 0 })

  useEffect(() => {
    api.listConnections().then((data: any) => {
      const items = data.items || data || []
      setConnections(items)
      if (items.length > 0) setSelectedConnection(items[0].id)
    }).catch(() => {})
  }, [])

  async function handleRunAll() {
    if (!selectedConnection) return
    setRunning(true)
    setError('')
    setResults([])

    try {
      if (testIds && testIds.length > 0) {
        // Run selected tests one by one
        setProgress({ completed: 0, total: testIds.length })
        const allResults: TestResult[] = []
        for (let i = 0; i < testIds.length; i++) {
          try {
            const result = await api.executeTest(projectId, testIds[i], selectedConnection)
            allResults.push(result)
          } catch (err) {
            allResults.push({
              id: `error-${i}`,
              test_case_id: testIds[i],
              status: 'error',
              response_content: null,
              response_time_ms: null,
              ack_code: null,
              error_message: err instanceof Error ? err.message : 'Execution failed',
              executed_at: new Date().toISOString(),
            })
          }
          setProgress({ completed: i + 1, total: testIds.length })
          setResults([...allResults])
        }
      } else {
        // Run all via batch endpoint
        const response = await api.executeAllTests(projectId, selectedConnection)
        if (response.task_id) {
          // Poll for results
          let attempts = 0
          while (attempts < 60) {
            await new Promise((r) => setTimeout(r, 2000))
            try {
              const resultsData = await api.listTestResults(projectId, 0, 200)
              if (resultsData.items && resultsData.items.length > 0) {
                setResults(resultsData.items)
                setProgress({ completed: resultsData.items.length, total: resultsData.total || resultsData.items.length })
                // Check if all done
                const latestResults = resultsData.items.filter(
                  (r: TestResult) => new Date(r.executed_at).getTime() > Date.now() - 120000
                )
                if (latestResults.length >= (resultsData.total || 0)) break
              }
            } catch { /* keep polling */ }
            attempts++
          }
        }
      }
      onComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run tests')
    } finally {
      setRunning(false)
    }
  }

  const passed = results.filter((r) => r.status === 'pass' || r.status === 'passed').length
  const failed = results.filter((r) => r.status === 'fail' || r.status === 'failed').length
  const errors = results.filter((r) => r.status === 'error').length
  const avgTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / results.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Connection selector and run button */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedConnection}
          onChange={(e) => setSelectedConnection(e.target.value)}
          className="input-field w-auto min-w-[200px]"
          disabled={running}
        >
          {connections.length === 0 && (
            <option value="">No IRIS connections</option>
          )}
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.host}/{c.namespace})
            </option>
          ))}
        </select>

        <button
          onClick={handleRunAll}
          disabled={running || !selectedConnection}
          className="btn-primary"
        >
          {running ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Running ({progress.completed}/{progress.total})...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              {testIds && testIds.length > 0 ? `Run ${testIds.length} Test${testIds.length !== 1 ? 's' : ''}` : 'Run All Tests'}
            </span>
          )}
        </button>
      </div>

      {/* Progress bar */}
      {running && progress.total > 0 && (
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-primary-500 transition-all"
            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary stats */}
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{results.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{passed}</p>
              <p className="text-xs text-emerald-600">Passed</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-red-700">{failed}</p>
              <p className="text-xs text-red-600">Failed</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{errors}</p>
              <p className="text-xs text-amber-600">Errors</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{avgTime}ms</p>
              <p className="text-xs text-slate-500">Avg Time</p>
            </div>
          </div>

          {/* Results table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600 w-8"></th>
                  <th className="px-4 py-3 font-medium text-slate-600">Test</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Protocol</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600">ACK</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((result) => {
                  const isExpanded = expandedResult === result.id
                  const Icon = statusIcon[result.status] || AlertTriangle
                  const testInfo = testNames?.[result.test_case_id]

                  return (
                    <tr key={result.id} className="group">
                      <td colSpan={6} className="p-0">
                        <button
                          onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                          className="flex w-full items-center hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3 w-8">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900 flex-1 text-left">
                            {testInfo?.name || result.test_case_id}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${protocolBadge[testInfo?.protocol || 'mllp'] || 'bg-slate-100 text-slate-600'}`}>
                              {testInfo?.protocol || 'mllp'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[result.status] || 'bg-slate-100 text-slate-600'}`}>
                              <Icon className={`h-3 w-3 ${statusColor[result.status] || 'text-slate-500'}`} />
                              {result.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {result.ack_code && (
                              <span className={`font-mono text-xs font-bold ${ackColor[result.ack_code] || 'text-slate-500'}`}>
                                {result.ack_code}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {result.response_time_ms !== null && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {result.response_time_ms}ms
                              </span>
                            )}
                          </td>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                            {result.error_message && (
                              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {result.error_message}
                              </div>
                            )}
                            {result.response_content && (
                              <div>
                                <p className="mb-2 text-xs font-medium text-slate-500 uppercase">Response</p>
                                {(testInfo?.protocol === 'mllp' || !testInfo?.protocol) ? (
                                  <HL7Viewer message={result.response_content} />
                                ) : (
                                  <pre className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-mono text-slate-700 overflow-x-auto max-h-64 overflow-y-auto">
                                    {result.response_content}
                                  </pre>
                                )}
                              </div>
                            )}
                            {!result.response_content && !result.error_message && (
                              <p className="text-sm text-slate-400">No response content</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
