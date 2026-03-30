'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Server, FileCode, Settings as SettingsIcon, Rocket, CheckCircle,
  AlertCircle, Loader2, Zap, ArrowRight, ArrowLeft, Check,
} from 'lucide-react'
import { api } from '@/lib/api'

interface Connection {
  id: string
  name: string
  base_url: string
  namespace: string
  environment: string
  is_active: boolean
}

interface DryRunClass {
  class_name: string
  iris_layer: string
  validation_status: string
  order: number
}

interface DeployStatus {
  project_id: string
  status: string
  task_id: string
  total_classes: number
  deployed: number
  failed: number
  results: Array<{
    class_name: string
    status: string
    error?: string
  }>
}

const steps = [
  { label: 'Connection', icon: Server },
  { label: 'Review Classes', icon: FileCode },
  { label: 'Options', icon: SettingsIcon },
  { label: 'Deploy', icon: Rocket },
  { label: 'Results', icon: CheckCircle },
]

const layerColors: Record<string, string> = {
  'Business Service': 'bg-blue-100 text-blue-700',
  'Business Process': 'bg-purple-100 text-purple-700',
  'Business Operation': 'bg-orange-100 text-orange-700',
  'Data Transformation': 'bg-cyan-100 text-cyan-700',
  'Message Class': 'bg-slate-100 text-slate-700',
  'Lookup Table': 'bg-amber-100 text-amber-700',
  'Production': 'bg-green-100 text-green-700',
  'Utility': 'bg-pink-100 text-pink-700',
}

const envBadge: Record<string, string> = {
  dev: 'bg-blue-100 text-blue-700',
  test: 'bg-amber-100 text-amber-700',
  prod: 'bg-red-100 text-red-700',
}

export default function DeployWizard({ projectId }: { projectId: string }) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  // Step 1 state
  const [connections, setConnections] = useState<Connection[]>([])
  const [loadingConnections, setLoadingConnections] = useState(true)
  const [selectedConnectionId, setSelectedConnectionId] = useState('')
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ connected: boolean; error?: string; response_time_ms?: number } | null>(null)

  // Step 2 state
  const [dryRunClasses, setDryRunClasses] = useState<DryRunClass[]>([])
  const [dryRunInfo, setDryRunInfo] = useState<{ iris_connection_name: string; namespace: string } | null>(null)
  const [loadingDryRun, setLoadingDryRun] = useState(false)

  // Step 3 state
  const [generateProduction, setGenerateProduction] = useState(true)

  // Step 4-5 state
  const [deploying, setDeploying] = useState(false)
  const [deployStatus, setDeployStatus] = useState<DeployStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadConnections()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function loadConnections() {
    try {
      setLoadingConnections(true)
      const data = await api.listConnections()
      const active = (data.items || []).filter((c: Connection) => c.is_active)
      setConnections(active)
      if (active.length === 1) setSelectedConnectionId(active[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections')
    } finally {
      setLoadingConnections(false)
    }
  }

  async function handleTestConnection() {
    if (!selectedConnectionId) return
    setTestingConnection(true)
    setTestResult(null)
    try {
      const result = await api.testConnection(selectedConnectionId)
      setTestResult(result)
    } catch (err) {
      setTestResult({ connected: false, error: err instanceof Error ? err.message : 'Test failed' })
    } finally {
      setTestingConnection(false)
    }
  }

  async function handleDryRun() {
    setLoadingDryRun(true)
    setError('')
    try {
      const result = await api.dryRunDeploy(projectId, { iris_connection_id: selectedConnectionId })
      setDryRunClasses(result.classes || [])
      setDryRunInfo({ iris_connection_name: result.iris_connection_name, namespace: result.namespace })
      setStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dry run failed')
    } finally {
      setLoadingDryRun(false)
    }
  }

  async function handleDeploy() {
    setDeploying(true)
    setError('')
    try {
      const result = await api.deployProject(projectId, {
        iris_connection_id: selectedConnectionId,
        generate_production: generateProduction,
      })
      setDeployStatus({
        project_id: projectId,
        status: 'deploying',
        task_id: result.task_id,
        total_classes: result.total_classes,
        deployed: 0,
        failed: 0,
        results: [],
      })
      setStep(3)
      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.getDeployStatus(projectId)
          setDeployStatus(status)
          if (status.status !== 'deploying' && status.status !== 'queued') {
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
            setDeploying(false)
            setStep(4)
          }
        } catch { /* ignore poll errors */ }
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deploy failed')
      setDeploying(false)
    }
  }

  const selectedConn = connections.find((c) => c.id === selectedConnectionId)

  return (
    <div className="card">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  i === step
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : i < step
                    ? 'border-primary-600 bg-primary-50 text-primary-600'
                    : 'border-slate-300 bg-white text-slate-400'
                }`}
              >
                {i < step ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium ${
                  i === step ? 'text-primary-700' : i < step ? 'text-primary-600' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-12 ${
                  i < step ? 'bg-primary-400' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Step 1: Select Connection */}
      {step === 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Select IRIS Connection</h3>
          {loadingConnections ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading connections...
            </div>
          ) : connections.length === 0 ? (
            <p className="text-sm text-slate-500">
              No active IRIS connections found. Please add one in the{' '}
              <a href="/iris-connections" className="text-primary-600 underline">IRIS Connections</a> page.
            </p>
          ) : (
            <>
              <select
                value={selectedConnectionId}
                onChange={(e) => {
                  setSelectedConnectionId(e.target.value)
                  setTestResult(null)
                }}
                className="input-field mb-4"
              >
                <option value="">Select a connection...</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.namespace}) - {c.environment}
                  </option>
                ))}
              </select>
              {selectedConn && (
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-700">{selectedConn.base_url}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${envBadge[selectedConn.environment] || envBadge.dev}`}>
                      {selectedConn.environment}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={!selectedConnectionId || testingConnection}
                  className="btn-secondary text-sm"
                >
                  {testingConnection ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Testing...
                    </span>
                  ) : (
                    <>
                      <Zap className="mr-1.5 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </button>
                {testResult && (
                  testResult.connected ? (
                    <span className="inline-flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Connected ({testResult.response_time_ms}ms)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {testResult.error || 'Connection failed'}
                    </span>
                  )
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleDryRun}
                  disabled={!selectedConnectionId || loadingDryRun}
                  className="btn-primary"
                >
                  {loadingDryRun ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running dry run...
                    </span>
                  ) : (
                    <>
                      Next: Review Classes
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Review Classes (dry-run results) */}
      {step === 1 && (
        <div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Review Classes to Deploy</h3>
          {dryRunInfo && (
            <p className="mb-4 text-sm text-slate-500">
              Target: <span className="font-medium text-slate-700">{dryRunInfo.iris_connection_name}</span>{' '}
              / <span className="font-mono">{dryRunInfo.namespace}</span>
            </p>
          )}
          {dryRunClasses.length === 0 ? (
            <p className="text-sm text-slate-500">No classes found for deployment.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-2.5 font-medium text-slate-600">#</th>
                    <th className="px-4 py-2.5 font-medium text-slate-600">Class Name</th>
                    <th className="px-4 py-2.5 font-medium text-slate-600">Layer</th>
                    <th className="px-4 py-2.5 font-medium text-slate-600">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dryRunClasses.map((cls, idx) => (
                    <tr key={cls.class_name} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-400">{cls.order ?? idx + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-900">{cls.class_name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${layerColors[cls.iris_layer] || 'bg-slate-100 text-slate-600'}`}>
                          {cls.iris_layer}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {cls.validation_status === 'passed' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Passed
                          </span>
                        ) : cls.validation_status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Failed
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">{cls.validation_status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(0)} className="btn-secondary">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </button>
            <button onClick={() => setStep(2)} disabled={dryRunClasses.length === 0} className="btn-primary">
              Next: Options
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Options */}
      {step === 2 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Deploy Options</h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={generateProduction}
                onChange={(e) => setGenerateProduction(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Generate Production.cls</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically generate and deploy the Production class that connects all Business Services,
                  Processes, and Operations.
                </p>
              </div>
            </label>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Deploy summary</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>Connection: <span className="font-medium">{selectedConn?.name}</span></li>
              <li>Namespace: <span className="font-mono">{selectedConn?.namespace}</span></li>
              <li>Classes: <span className="font-medium">{dryRunClasses.length}</span></li>
              <li>Generate Production: <span className="font-medium">{generateProduction ? 'Yes' : 'No'}</span></li>
            </ul>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </button>
            <button onClick={handleDeploy} disabled={deploying} className="btn-primary">
              {deploying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying...
                </span>
              ) : (
                <>
                  <Rocket className="mr-1.5 h-4 w-4" />
                  Deploy to IRIS
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Deploying (progress) */}
      {step === 3 && deployStatus && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Deploying...</h3>
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary-500 mb-4" />
            <p className="text-sm text-slate-600 animate-pulse">
              Deploying classes to IRIS...
            </p>
            <div className="mt-6 w-full max-w-md">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{deployStatus.deployed + deployStatus.failed} / {deployStatus.total_classes} classes</span>
                <span>{deployStatus.total_classes > 0 ? Math.round(((deployStatus.deployed + deployStatus.failed) / deployStatus.total_classes) * 100) : 0}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200">
                <div
                  className="h-2.5 rounded-full bg-primary-500 transition-all animate-pulse"
                  style={{
                    width: `${deployStatus.total_classes > 0 ? ((deployStatus.deployed + deployStatus.failed) / deployStatus.total_classes) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex gap-4 text-xs">
                <span className="text-green-600">Deployed: {deployStatus.deployed}</span>
                {deployStatus.failed > 0 && (
                  <span className="text-red-600">Failed: {deployStatus.failed}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Results */}
      {step === 4 && deployStatus && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Deploy Results</h3>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{deployStatus.total_classes}</p>
              <p className="text-xs text-slate-500">Total Classes</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{deployStatus.deployed}</p>
              <p className="text-xs text-green-600">Deployed</p>
            </div>
            <div className={`rounded-lg border p-4 text-center ${deployStatus.failed > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
              <p className={`text-2xl font-bold ${deployStatus.failed > 0 ? 'text-red-700' : 'text-slate-900'}`}>{deployStatus.failed}</p>
              <p className={`text-xs ${deployStatus.failed > 0 ? 'text-red-600' : 'text-slate-500'}`}>Failed</p>
            </div>
          </div>
          {deployStatus.results && deployStatus.results.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-2.5 font-medium text-slate-600">Class</th>
                    <th className="px-4 py-2.5 font-medium text-slate-600">Status</th>
                    <th className="px-4 py-2.5 font-medium text-slate-600">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deployStatus.results.map((r) => (
                    <tr key={r.class_name} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-900">{r.class_name}</td>
                      <td className="px-4 py-2.5">
                        {r.status === 'deployed' || r.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Deployed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-red-600">{r.error || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
