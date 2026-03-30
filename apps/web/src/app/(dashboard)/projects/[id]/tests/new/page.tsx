'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import HL7Viewer from '@/components/hl7-viewer'

const HL7_TEMPLATE = `MSH|^~\\&|SENDING_APP|SENDING_FAC|RECEIVING_APP|RECEIVING_FAC|20240101120000||ADT^A01|MSG00001|P|2.4
EVN|A01|20240101120000
PID|1||12345^^^FACILITY^MR||DOE^JOHN^A||19800101|M|||123 MAIN ST^^ANYTOWN^ST^12345||555-1234
PV1|1|I|ICU^101^A|E|||1234^SMITH^JANE^M^MD|5678^JONES^BOB^R^MD|MED||||7|||1234^SMITH^JANE^M^MD|IP|V00001|||||||||||||||||||||||||20240101120000`

export default function NewTestPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const editId = searchParams.get('edit')

  const [name, setName] = useState('')
  const [protocol, setProtocol] = useState('mllp')
  const [targetHost, setTargetHost] = useState('')
  const [targetPort, setTargetPort] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [expectedResponse, setExpectedResponse] = useState('AA')
  const [hl7MessageType, setHl7MessageType] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!editId)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (editId) {
      loadTest()
    }
  }, [editId])

  async function loadTest() {
    try {
      setLoading(true)
      const tests = await api.listTests(projectId, 0, 200)
      const test = (tests.items || []).find((t: any) => t.id === editId)
      if (test) {
        setName(test.name)
        setProtocol(test.protocol)
        setTargetHost(test.target_host || '')
        setTargetPort(test.target_port?.toString() || '')
        setMessageContent(test.message_content)
        setExpectedResponse(test.expected_response || 'AA')
        setHl7MessageType(test.hl7_message_type || '')
        setTagsInput((test.tags || []).join(', '))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const data: any = {
      name,
      protocol,
      message_content: messageContent,
    }
    if (targetHost) data.target_host = targetHost
    if (targetPort) data.target_port = parseInt(targetPort, 10)
    if (expectedResponse) data.expected_response = expectedResponse
    if (hl7MessageType) data.hl7_message_type = hl7MessageType
    if (tagsInput.trim()) {
      data.tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    }

    try {
      if (editId) {
        await api.updateTest(projectId, editId, data)
      } else {
        await api.createTest(projectId, data)
      }
      router.push(`/projects/${projectId}/tests`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save test case')
    } finally {
      setSaving(false)
    }
  }

  function insertTemplate() {
    setMessageContent(HL7_TEMPLATE)
    setHl7MessageType('ADT^A01')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

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
        <h1 className="text-2xl font-bold text-slate-900">
          {editId ? 'Edit Test Case' : 'New Test Case'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {editId ? 'Update the test case configuration' : 'Create a new test case for your IRIS deployment'}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Test Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., ADT A01 Patient Admission"
              className="input-field"
            />
          </div>

          {/* Protocol */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Protocol <span className="text-red-500">*</span>
            </label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="input-field"
            >
              <option value="mllp">MLLP (HL7 v2)</option>
              <option value="http">HTTP (REST)</option>
              <option value="soap">SOAP (Web Service)</option>
            </select>
          </div>

          {/* Target Host & Port */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Target Host
                <span className="ml-1 text-xs text-slate-400">(optional, uses IRIS connection if empty)</span>
              </label>
              <input
                type="text"
                value={targetHost}
                onChange={(e) => setTargetHost(e.target.value)}
                placeholder="e.g., 192.168.1.100"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Target Port
                <span className="ml-1 text-xs text-slate-400">(optional)</span>
              </label>
              <input
                type="number"
                value={targetPort}
                onChange={(e) => setTargetPort(e.target.value)}
                placeholder={protocol === 'mllp' ? '2100' : protocol === 'soap' ? '443' : '8080'}
                className="input-field"
              />
            </div>
          </div>

          {/* HL7 Message Type */}
          {protocol === 'mllp' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                HL7 Message Type
                <span className="ml-1 text-xs text-slate-400">(e.g., ADT^A01, ORM^O01)</span>
              </label>
              <input
                type="text"
                value={hl7MessageType}
                onChange={(e) => setHl7MessageType(e.target.value)}
                placeholder="ADT^A01"
                className="input-field"
              />
            </div>
          )}

          {/* Message Content */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Message Content <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {protocol === 'mllp' && (
                  <button
                    type="button"
                    onClick={insertTemplate}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Insert ADT^A01 template
                  </button>
                )}
                {messageContent && protocol === 'mllp' && (
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <FileText className="h-3 w-3" />
                    {showPreview ? 'Hide Preview' : 'Preview'}
                  </button>
                )}
              </div>
            </div>
            <textarea
              required
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={10}
              placeholder={
                protocol === 'mllp'
                  ? 'MSH|^~\\&|...\nPID|1|...\nPV1|1|...'
                  : protocol === 'soap'
                  ? '<soapenv:Envelope>...</soapenv:Envelope>'
                  : '{"patient_id": "12345", ...}'
              }
              className="input-field font-mono text-xs resize-y"
            />
          </div>

          {/* HL7 Preview */}
          {showPreview && messageContent && protocol === 'mllp' && (
            <div>
              <HL7Viewer message={messageContent} title="HL7 Message Preview" />
            </div>
          )}

          {/* Expected Response */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Expected Response
              <span className="ml-1 text-xs text-slate-400">
                {protocol === 'mllp' ? '(ACK code: AA, AE, AR)' : '(optional)'}
              </span>
            </label>
            <input
              type="text"
              value={expectedResponse}
              onChange={(e) => setExpectedResponse(e.target.value)}
              placeholder={protocol === 'mllp' ? 'AA' : '200 OK'}
              className="input-field"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tags
              <span className="ml-1 text-xs text-slate-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., admission, adt, smoke-test"
              className="input-field"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {editId ? 'Update Test Case' : 'Create Test Case'}
              </span>
            )}
          </button>
          <Link href={`/projects/${projectId}/tests`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
