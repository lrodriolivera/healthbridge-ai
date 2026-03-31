'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle,
  Clock, BarChart3, ChevronDown, ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import HL7Viewer from '@/components/hl7-viewer'

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

interface TestCase {
  id: string
  name: string
  protocol: string
  hl7_message_type: string | null
}

const statusBadge: Record<string, string> = {
  pass: 'bg-emerald-100 text-emerald-700',
  passed: 'bg-emerald-100 text-emerald-700',
  fail: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  error: 'bg-amber-100 text-amber-700',
}

const protocolBadge: Record<string, string> = {
  mllp: 'bg-blue-100 text-blue-700',
  http: 'bg-teal-100 text-teal-700',
  soap: 'bg-purple-100 text-purple-700',
}

const ackColor: Record<string, string> = {
  AA: 'text-green-600',
  AE: 'text-orange-600',
  AR: 'text-red-600',
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

export default function ResultsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [results, setResults] = useState<TestResult[]>([])
  const [testMap, setTestMap] = useState<Record<string, TestCase>>({})
  const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0, errors: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    try {
      setLoading(true)
      const [resultsData, testsData] = await Promise.all([
        api.listTestResults(projectId, 0, 200),
        api.listTests(projectId, 0, 200),
      ])

      setResults(resultsData.items || [])
      setSummary({
        total: resultsData.total || 0,
        passed: resultsData.passed || 0,
        failed: resultsData.failed || 0,
        errors: resultsData.errors || 0,
      })

      const map: Record<string, TestCase> = {}
      for (const t of (testsData.items || [])) {
        map[t.id] = t
      }
      setTestMap(map)
    } catch {
      // No results yet
    } finally {
      setLoading(false)
    }
  }

  const filteredResults = statusFilter === 'all'
    ? results
    : results.filter((r) => r.status === statusFilter || r.status === statusFilter + 'ed')

  const avgTime = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.response_time_ms || 0), 0) / results.length)
    : 0

  return (
    <div>
      <Link
        href={`/projects/${projectId}/tests`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tests
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Test Results Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Detailed view of all test execution results
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{summary.total}</p>
              <p className="text-xs text-slate-500 mt-1">Total Tests</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold text-emerald-700">{summary.passed}</p>
              <p className="text-xs text-emerald-600 mt-1">Passed</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-red-700">{summary.failed}</p>
              <p className="text-xs text-red-600 mt-1">Failed</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-amber-700">{summary.errors}</p>
              <p className="text-xs text-amber-600 mt-1">Errors</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{avgTime}<span className="text-base font-normal text-slate-400">ms</span></p>
              <p className="text-xs text-slate-500 mt-1">Avg Response</p>
            </div>
          </div>

          {/* Pass rate bar */}
          {summary.total > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Pass Rate</span>
                <span className="text-sm font-bold text-slate-900">
                  {Math.round((summary.passed / summary.total) * 100)}%
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                {summary.passed > 0 && (
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(summary.passed / summary.total) * 100}%` }}
                  />
                )}
                {summary.failed > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(summary.failed / summary.total) * 100}%` }}
                  />
                )}
                {summary.errors > 0 && (
                  <div
                    className="bg-amber-500 transition-all"
                    style={{ width: `${(summary.errors / summary.total) * 100}%` }}
                  />
                )}
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Passed
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Failed
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Errors
                </span>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Filter by status:</span>
            {['all', 'pass', 'fail', 'error'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Results table */}
          {filteredResults.length === 0 ? (
            <div className="card flex flex-col items-center py-12 text-center">
              <BarChart3 className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No test results</p>
              <p className="mt-1 text-sm text-slate-500">
                {statusFilter !== 'all'
                  ? `No results with status "${statusFilter}"`
                  : 'Execute tests to see results here'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3 font-medium text-slate-600">Test Case</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Protocol</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-600">ACK Code</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Response Time</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map((result) => {
                    const isExpanded = expandedResult === result.id
                    const test = testMap[result.test_case_id]
                    const sClass = statusBadge[result.status] || 'bg-slate-100 text-slate-600'

                    return (
                      <tr key={result.id}>
                        <td colSpan={7} className="p-0">
                          <button
                            onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                            className="flex w-full items-center hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="px-4 py-3 w-8">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="px-4 py-3 flex-1">
                              <span className="font-medium text-slate-900">
                                {test?.name || result.test_case_id}
                              </span>
                              {test?.hl7_message_type && (
                                <span className="ml-2 font-mono text-xs text-slate-400">
                                  {test.hl7_message_type}
                                </span>
                              )}
                            </div>
                            <div className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${protocolBadge[test?.protocol || 'mllp'] || 'bg-slate-100 text-slate-600'}`}>
                                {test?.protocol || 'mllp'}
                              </span>
                            </div>
                            <div className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sClass}`}>
                                {result.status}
                              </span>
                            </div>
                            <div className="px-4 py-3">
                              {result.ack_code ? (
                                <span className={`font-mono text-sm font-bold ${ackColor[result.ack_code] || 'text-slate-500'}`}>
                                  {result.ack_code}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                            <div className="px-4 py-3">
                              {result.response_time_ms !== null ? (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  {result.response_time_ms}ms
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                            <div className="px-4 py-3 text-xs text-slate-500">
                              {formatDate(result.executed_at)}
                            </div>
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                              {result.error_message && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                                  <p className="text-xs font-medium text-red-800 uppercase mb-1">Error</p>
                                  <p className="text-sm text-red-700">{result.error_message}</p>
                                </div>
                              )}
                              {result.response_content ? (
                                <div>
                                  <p className="mb-2 text-xs font-medium text-slate-500 uppercase">
                                    Response Content
                                  </p>
                                  {(test?.protocol === 'mllp' || !test?.protocol) ? (
                                    <HL7Viewer message={result.response_content} title="HL7 ACK Response" />
                                  ) : (
                                    <pre className="rounded-lg border border-slate-200 bg-white p-4 text-xs font-mono text-slate-700 overflow-x-auto max-h-80 overflow-y-auto">
                                      {result.response_content}
                                    </pre>
                                  )}
                                </div>
                              ) : (
                                !result.error_message && (
                                  <p className="text-sm text-slate-400">No response content available</p>
                                )
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
          )}
        </div>
      )}
    </div>
  )
}
