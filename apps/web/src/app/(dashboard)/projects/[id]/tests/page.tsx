'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Play, Upload, Trash2, Pencil,
  Loader2, FlaskConical, BarChart3, FileText,
} from 'lucide-react'
import { api } from '@/lib/api'
import TestRunner from '@/components/test-runner'
import HL7Viewer from '@/components/hl7-viewer'

interface TestCase {
  id: string
  project_id: string
  name: string
  protocol: string
  target_host: string | null
  target_port: number | null
  message_content: string
  expected_response: string | null
  hl7_message_type: string | null
  tags: string[] | null
  created_at: string
}

const protocolBadge: Record<string, string> = {
  mllp: 'bg-blue-100 text-blue-700',
  http: 'bg-teal-100 text-teal-700',
  soap: 'bg-purple-100 text-purple-700',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TestsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [activeTab, setActiveTab] = useState<'cases' | 'results'>('cases')
  const [tests, setTests] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set())
  const [expandedTest, setExpandedTest] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Results state
  const [results, setResults] = useState<any[]>([])
  const [resultsSummary, setResultsSummary] = useState({ total: 0, passed: 0, failed: 0, errors: 0 })
  const [loadingResults, setLoadingResults] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  useEffect(() => {
    loadTests()
  }, [projectId])

  useEffect(() => {
    if (activeTab === 'results') loadResults()
  }, [activeTab, projectId])

  async function loadTests() {
    try {
      setLoading(true)
      const data = await api.listTests(projectId, 0, 200)
      setTests(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tests')
    } finally {
      setLoading(false)
    }
  }

  async function loadResults() {
    try {
      setLoadingResults(true)
      const data = await api.listTestResults(projectId, 0, 200)
      setResults(data.items || [])
      setResultsSummary({
        total: data.total || 0,
        passed: data.passed || 0,
        failed: data.failed || 0,
        errors: data.errors || 0,
      })
    } catch {
      // No results yet
    } finally {
      setLoadingResults(false)
    }
  }

  async function handleDelete(testId: string) {
    if (!confirm('Delete this test case?')) return
    setDeleting(testId)
    try {
      await api.updateTest(projectId, testId, { _delete: true })
      setTests((prev) => prev.filter((t) => t.id !== testId))
      setSelectedTests((prev) => {
        const next = new Set(prev)
        next.delete(testId)
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test')
    } finally {
      setDeleting(null)
    }
  }

  function toggleSelect(testId: string) {
    setSelectedTests((prev) => {
      const next = new Set(prev)
      if (next.has(testId)) next.delete(testId)
      else next.add(testId)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedTests.size === tests.length) {
      setSelectedTests(new Set())
    } else {
      setSelectedTests(new Set(tests.map((t) => t.id)))
    }
  }

  async function handleImport() {
    if (!importText.trim()) return
    setImporting(true)
    setError('')
    try {
      // Parse HL7 messages separated by blank lines
      const rawMessages = importText.split(/\n\s*\n/).filter((m) => m.trim())
      const messages = rawMessages.map((msg, i) => {
        const lines = msg.trim().split(/\r\n|\r|\n/)
        const mshLine = lines.find((l) => l.startsWith('MSH'))
        let msgType = ''
        if (mshLine) {
          const fields = mshLine.split('|')
          if (fields.length > 8) msgType = fields[8]
        }
        return {
          name: `Imported HL7 ${msgType || `#${i + 1}`}`,
          message_content: msg.trim(),
          hl7_message_type: msgType || undefined,
        }
      })
      await api.importHL7(projectId, messages)
      setShowImport(false)
      setImportText('')
      loadTests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import HL7 messages')
    } finally {
      setImporting(false)
    }
  }

  const testNameMap: Record<string, { name: string; protocol: string }> = {}
  for (const t of tests) {
    testNameMap[t.id] = { name: t.name, protocol: t.protocol }
  }

  const filteredResults = statusFilter === 'all'
    ? results
    : results.filter((r) => r.status === statusFilter || r.status === statusFilter + 'ed')

  return (
    <div>
      <Link
        href={`/projects/${projectId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Testing</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and execute test cases against your IRIS deployment
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        <button
          onClick={() => setActiveTab('cases')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'cases'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          Test Cases
          {tests.length > 0 && (
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs">{tests.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'results'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Results
        </button>
      </div>

      {/* Test Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          {/* Actions bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link href={`/projects/${projectId}/tests/new`} className="btn-primary text-sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Test Case
            </Link>
            <button onClick={() => setShowImport(true)} className="btn-secondary text-sm">
              <Upload className="mr-1.5 h-4 w-4" />
              Import HL7
            </button>
          </div>

          {/* Test Runner */}
          {tests.length > 0 && (
            <div className="card">
              <h3 className="mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wider">Execute Tests</h3>
              <TestRunner
                projectId={projectId}
                testIds={selectedTests.size > 0 ? Array.from(selectedTests) : undefined}
                testNames={testNameMap}
                onComplete={() => { loadTests(); loadResults() }}
              />
            </div>
          )}

          {/* Test Cases list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : tests.length === 0 ? (
            <div className="card flex flex-col items-center py-12 text-center">
              <FlaskConical className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No test cases yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Create a test case or import HL7 messages to get started
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedTests.size === tests.length && tests.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Protocol</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Message Type</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Created</th>
                    <th className="px-4 py-3 font-medium text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.map((test) => (
                    <tr key={test.id} className="group">
                      <td colSpan={6} className="p-0">
                        <div>
                          <div className="flex items-center hover:bg-slate-50 transition-colors">
                            <div className="px-4 py-3 w-10">
                              <input
                                type="checkbox"
                                checked={selectedTests.has(test.id)}
                                onChange={() => toggleSelect(test.id)}
                                className="rounded border-slate-300"
                              />
                            </div>
                            <button
                              onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                              className="flex-1 flex items-center text-left"
                            >
                              <div className="px-4 py-3 flex-1">
                                <span className="font-medium text-slate-900">{test.name}</span>
                              </div>
                              <div className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${protocolBadge[test.protocol] || 'bg-slate-100 text-slate-600'}`}>
                                  {test.protocol}
                                </span>
                              </div>
                              <div className="px-4 py-3">
                                {test.hl7_message_type && (
                                  <span className="font-mono text-xs text-slate-600">{test.hl7_message_type}</span>
                                )}
                              </div>
                              <div className="px-4 py-3 text-slate-500 text-xs">
                                {formatDate(test.created_at)}
                              </div>
                            </button>
                            <div className="px-4 py-3 flex items-center gap-1 justify-end">
                              <button
                                onClick={() => router.push(`/projects/${projectId}/tests/new?edit=${test.id}`)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(test.id)}
                                disabled={deleting === test.id}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                {deleting === test.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          {expandedTest === test.id && (
                            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                              <div className="grid gap-4 sm:grid-cols-2 mb-3">
                                {test.target_host && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Target</p>
                                    <p className="text-sm font-mono text-slate-700">{test.target_host}:{test.target_port}</p>
                                  </div>
                                )}
                                {test.expected_response && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Expected Response</p>
                                    <p className="text-sm font-mono text-slate-700">{test.expected_response}</p>
                                  </div>
                                )}
                                {test.tags && test.tags.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Tags</p>
                                    <div className="flex gap-1 flex-wrap">
                                      {test.tags.map((tag) => (
                                        <span key={tag} className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Message Content</p>
                              {test.protocol === 'mllp' ? (
                                <HL7Viewer message={test.message_content} />
                              ) : (
                                <pre className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-mono text-slate-700 overflow-x-auto max-h-64 overflow-y-auto">
                                  {test.message_content}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Results tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {loadingResults ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{resultsSummary.total}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{resultsSummary.passed}</p>
                  <p className="text-xs text-emerald-600">Passed</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{resultsSummary.failed}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{resultsSummary.errors}</p>
                  <p className="text-xs text-amber-600">Errors</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {results.length > 0
                      ? Math.round(results.reduce((s: number, r: any) => s + (r.response_time_ms || 0), 0) / results.length)
                      : 0}ms
                  </p>
                  <p className="text-xs text-slate-500">Avg Time</p>
                </div>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Filter:</span>
                {['all', 'pass', 'fail', 'error'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === f
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Results link to full page */}
              <div className="text-right">
                <Link
                  href={`/projects/${projectId}/tests/results`}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View full results dashboard
                </Link>
              </div>

              {/* Results table */}
              {filteredResults.length === 0 ? (
                <div className="card flex flex-col items-center py-12 text-center">
                  <BarChart3 className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="font-medium text-slate-700">No test results yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Execute tests from the Test Cases tab to see results here
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 font-medium text-slate-600">Test</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                        <th className="px-4 py-3 font-medium text-slate-600">ACK</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Time</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Executed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResults.map((result: any) => {
                        const isExpanded = expandedResult === result.id
                        const testInfo = testNameMap[result.test_case_id]
                        const sBadge = result.status === 'pass' || result.status === 'passed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : result.status === 'fail' || result.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'

                        return (
                          <tr key={result.id}>
                            <td colSpan={5} className="p-0">
                              <button
                                onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                                className="flex w-full items-center hover:bg-slate-50 transition-colors text-left"
                              >
                                <div className="px-4 py-3 flex-1 font-medium text-slate-900">
                                  {testInfo?.name || result.test_case_id}
                                </div>
                                <div className="px-4 py-3">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sBadge}`}>
                                    {result.status}
                                  </span>
                                </div>
                                <div className="px-4 py-3">
                                  {result.ack_code && (
                                    <span className={`font-mono text-xs font-bold ${
                                      result.ack_code === 'AA' ? 'text-green-600' :
                                      result.ack_code === 'AE' ? 'text-orange-600' : 'text-red-600'
                                    }`}>
                                      {result.ack_code}
                                    </span>
                                  )}
                                </div>
                                <div className="px-4 py-3 text-xs text-slate-500">
                                  {result.response_time_ms !== null ? `${result.response_time_ms}ms` : '-'}
                                </div>
                                <div className="px-4 py-3 text-xs text-slate-500">
                                  {formatDate(result.executed_at)}
                                </div>
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
                                      {testInfo?.protocol === 'mllp' || !testInfo?.protocol ? (
                                        <HL7Viewer message={result.response_content} />
                                      ) : (
                                        <pre className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-mono text-slate-700 overflow-x-auto max-h-64 overflow-y-auto">
                                          {result.response_content}
                                        </pre>
                                      )}
                                    </div>
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
            </>
          )}
        </div>
      )}

      {/* Import HL7 Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Import HL7 Messages</h3>
            <p className="mt-1 text-sm text-slate-500">
              Paste one or more HL7 messages separated by blank lines. Each message will be created as a separate test case.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={12}
              placeholder={"MSH|^~\\&|SENDING|FACILITY|...\nPID|1|...\nPV1|1|...\n\nMSH|^~\\&|ANOTHER|...\nPID|1|..."}
              className="input-field mt-4 font-mono text-xs resize-none"
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button onClick={() => setShowImport(false)} className="btn-secondary" disabled={importing}>
                Cancel
              </button>
              <button onClick={handleImport} disabled={importing || !importText.trim()} className="btn-primary">
                {importing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
