const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    // Ensure trailing slash before query params to avoid FastAPI 307 redirects
    let normalizedPath = path
    const qsIndex = normalizedPath.indexOf('?')
    if (qsIndex === -1) {
      if (!normalizedPath.endsWith('/')) normalizedPath += '/'
    } else {
      const base = normalizedPath.substring(0, qsIndex)
      const qs = normalizedPath.substring(qsIndex)
      if (!base.endsWith('/')) normalizedPath = base + '/' + qs
    }

    const res = await fetch(`${API_BASE}${normalizedPath}`, { ...options, headers })

    if (res.status === 401) {
      localStorage.removeItem('token')
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP ${res.status}`)
    }

    if (res.status === 204) return null
    return res.json()
  }

  // Auth
  login(email: string, password: string) {
    return this.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  register(email: string, password: string, tenant_name: string) {
    return this.fetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenant_name }),
    })
  }

  getMe() {
    return this.fetch('/auth/me')
  }

  // Projects
  listProjects(skip = 0, limit = 20) {
    return this.fetch(`/projects?skip=${skip}&limit=${limit}`)
  }

  getProject(id: string) {
    return this.fetch(`/projects/${id}`)
  }

  createProject(data: { name: string; description?: string; source_platforms: string[] }) {
    return this.fetch('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  updateProject(id: string, data: Record<string, unknown>) {
    return this.fetch(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  deleteProject(id: string) {
    return this.fetch(`/projects/${id}`, {
      method: 'DELETE',
    })
  }

  // Uploads
  async uploadFile(projectId: string, file: File) {
    const token = this.getToken()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE}/projects/${projectId}/uploads/direct`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    })
    if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; throw new Error('Unauthorized') }
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
    return res.json()
  }

  async uploadImage(projectId: string, file: File) {
    const token = this.getToken()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE}/projects/${projectId}/uploads/images`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    })
    if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; throw new Error('Unauthorized') }
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`) }
    return res.json()
  }

  listUploads(projectId: string) {
    return this.fetch(`/projects/${projectId}/uploads`)
  }

  triggerAnalysis(projectId: string) {
    return this.fetch(`/projects/${projectId}/analyze`, { method: 'POST' })
  }

  getAnalysisStatus(projectId: string) {
    return this.fetch(`/projects/${projectId}/analysis/status`)
  }

  listComponents(projectId: string, skip = 0, limit = 20) {
    return this.fetch(`/projects/${projectId}/components?skip=${skip}&limit=${limit}`)
  }

  getComponent(projectId: string, componentId: string) {
    return this.fetch(`/projects/${projectId}/components/${componentId}`)
  }

  analyzeImage(projectId: string, fileKey: string, mediaType = 'image/png') {
    return this.fetch(`/projects/${projectId}/analyze-image`, {
      method: 'POST',
      body: JSON.stringify({ file_key: fileKey, media_type: mediaType }),
    })
  }

  // Mappings
  listMappings(projectId: string, skip = 0, limit = 50) {
    return this.fetch(`/projects/${projectId}/mappings?skip=${skip}&limit=${limit}`)
  }

  createMapping(projectId: string, data: any) {
    return this.fetch(`/projects/${projectId}/mappings`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  updateMapping(projectId: string, mappingId: string, data: any) {
    return this.fetch(`/projects/${projectId}/mappings/${mappingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  deleteMapping(projectId: string, mappingId: string) {
    return this.fetch(`/projects/${projectId}/mappings/${mappingId}`, {
      method: 'DELETE',
    })
  }

  autoGenerateMappings(projectId: string) {
    return this.fetch(`/projects/${projectId}/mappings/auto-generate`, {
      method: 'POST',
    })
  }

  confirmMapping(projectId: string, mappingId: string) {
    return this.fetch(`/projects/${projectId}/mappings/${mappingId}/confirm`, {
      method: 'POST',
    })
  }

  getMappingGraph(projectId: string) {
    return this.fetch(`/projects/${projectId}/mappings/graph`)
  }

  // Code Generation
  generateAll(projectId: string) {
    return this.fetch(`/projects/${projectId}/generate`, {
      method: 'POST',
    })
  }

  generateSingle(projectId: string, mappingId: string) {
    return this.fetch(`/projects/${projectId}/generate/${mappingId}`, {
      method: 'POST',
    })
  }

  listGenerated(projectId: string, skip = 0, limit = 50) {
    return this.fetch(`/projects/${projectId}/generated?skip=${skip}&limit=${limit}`)
  }

  getGenerated(projectId: string, classId: string) {
    return this.fetch(`/projects/${projectId}/generated/${classId}`)
  }

  regenerate(projectId: string, classId: string, feedback?: string) {
    return this.fetch(`/projects/${projectId}/generated/${classId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    })
  }

  async downloadGenerated(projectId: string, classId: string) {
    const token = this.getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_BASE}/projects/${projectId}/generated/${classId}/download`, { headers })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.blob()
  }

  async downloadAllGenerated(projectId: string) {
    const token = this.getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_BASE}/projects/${projectId}/generated/download-all`, {
      method: 'POST',
      headers,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.blob()
  }

  // IRIS Connections
  listConnections() {
    return this.fetch('/iris-connections')
  }

  createConnection(data: any) {
    return this.fetch('/iris-connections', { method: 'POST', body: JSON.stringify(data) })
  }

  updateConnection(id: string, data: any) {
    return this.fetch(`/iris-connections/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  deleteConnection(id: string) {
    return this.fetch(`/iris-connections/${id}`, { method: 'DELETE' })
  }

  testConnection(id: string) {
    return this.fetch(`/iris-connections/${id}/test`, { method: 'POST' })
  }

  // Deploy
  deployProject(projectId: string, data: { iris_connection_id: string; generate_production: boolean }) {
    return this.fetch(`/projects/${projectId}/deploy`, { method: 'POST', body: JSON.stringify(data) })
  }

  dryRunDeploy(projectId: string, data: { iris_connection_id: string }) {
    return this.fetch(`/projects/${projectId}/deploy/dry-run`, { method: 'POST', body: JSON.stringify(data) })
  }

  getDeployStatus(projectId: string) {
    return this.fetch(`/projects/${projectId}/deploy/status`)
  }

  getDeployHistory(projectId: string) {
    return this.fetch(`/projects/${projectId}/deploy/history`)
  }

  // Tests
  listTests(projectId: string, skip = 0, limit = 50) {
    return this.fetch(`/projects/${projectId}/tests?skip=${skip}&limit=${limit}`)
  }

  createTest(projectId: string, data: any) {
    return this.fetch(`/projects/${projectId}/tests`, { method: 'POST', body: JSON.stringify(data) })
  }

  updateTest(projectId: string, testId: string, data: any) {
    return this.fetch(`/projects/${projectId}/tests/${testId}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  executeTest(projectId: string, testId: string, connectionId: string) {
    return this.fetch(`/projects/${projectId}/tests/${testId}/execute`, { method: 'POST', body: JSON.stringify({ iris_connection_id: connectionId }) })
  }

  executeAllTests(projectId: string, connectionId: string) {
    return this.fetch(`/projects/${projectId}/tests/execute-all`, { method: 'POST', body: JSON.stringify({ iris_connection_id: connectionId }) })
  }

  listTestResults(projectId: string, skip = 0, limit = 50) {
    return this.fetch(`/projects/${projectId}/tests/results?skip=${skip}&limit=${limit}`)
  }

  getTestResult(projectId: string, resultId: string) {
    return this.fetch(`/projects/${projectId}/tests/results/${resultId}`)
  }

  importHL7(projectId: string, messages: any[]) {
    return this.fetch(`/projects/${projectId}/tests/import-hl7`, { method: 'POST', body: JSON.stringify({ messages }) })
  }

  // Audit
  listAuditLogs(params?: { resource_type?: string; action?: string; skip?: number; limit?: number }) {
    const qs = new URLSearchParams()
    if (params?.resource_type) qs.set('resource_type', params.resource_type)
    if (params?.action) qs.set('action', params.action)
    qs.set('skip', String(params?.skip || 0))
    qs.set('limit', String(params?.limit || 50))
    return this.fetch(`/audit-logs?${qs}`)
  }

  // Export
  getProjectSummary(projectId: string) {
    return this.fetch(`/projects/${projectId}/export/summary`)
  }

  async downloadDocumentation(projectId: string) {
    const token = this.getToken()
    const res = await fetch(`${API_BASE}/projects/${projectId}/export/documentation`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Download failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `documentation.md`
    a.click()
    URL.revokeObjectURL(url)
  }
}

export const api = new ApiClient()
