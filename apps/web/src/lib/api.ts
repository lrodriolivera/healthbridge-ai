const API_BASE = '/api/v1'

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

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

    if (res.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
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

  createProject(data: { name: string; description?: string; source_platform: string }) {
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
}

export const api = new ApiClient()
