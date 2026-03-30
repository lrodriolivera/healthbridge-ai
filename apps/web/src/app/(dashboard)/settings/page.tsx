'use client'

import { useState, useEffect } from 'react'
import {
  Settings, User, Brain, Bell, Database, Save, Loader2, CheckCircle, Eye, EyeOff,
} from 'lucide-react'
import { api } from '@/lib/api'

interface TenantSettingsData {
  organization_name: string | null
  analysis_model: string | null
  codegen_model: string | null
  high_complexity_model: string | null
  webhook_url: string | null
  notify_on_analysis: boolean
  notify_on_deploy: boolean
  notify_on_test: boolean
  default_namespace: string | null
  default_iris_connection_id: string | null
  auto_purge_uploads_days: number | null
}

interface ModelInfo {
  id: string
  name: string
  tier: string
}

const tierBadge: Record<string, string> = {
  premium: 'bg-purple-100 text-purple-700',
  standard: 'bg-blue-100 text-blue-700',
  fast: 'bg-emerald-100 text-emerald-700',
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'organization' | 'models' | 'notifications' | 'profile'>('organization')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Tenant settings
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [settings, setSettings] = useState<TenantSettingsData>({
    organization_name: null, analysis_model: null, codegen_model: null,
    high_complexity_model: null, webhook_url: null, notify_on_analysis: true,
    notify_on_deploy: true, notify_on_test: true, default_namespace: null,
    default_iris_connection_id: null, auto_purge_uploads_days: null,
  })

  // Models
  const [models, setModels] = useState<ModelInfo[]>([])
  const [currentModels, setCurrentModels] = useState<Record<string, string>>({})

  // Profile
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const [tenantData, modelsData, profileData] = await Promise.all([
        api.getTenantSettings(),
        api.getAvailableModels(),
        api.getProfile(),
      ])
      setTenantName(tenantData.tenant_name)
      setTenantSlug(tenantData.tenant_slug)
      setSettings(tenantData.settings)
      setModels(modelsData.models)
      setCurrentModels(modelsData.current)
      setEmail(profileData.email)
      setRole(profileData.role)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await api.updateTenantSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const data: any = {}
      if (email) data.email = email
      if (newPassword && currentPassword) {
        data.current_password = currentPassword
        data.new_password = newPassword
      }
      await api.updateProfile(data)
      setSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'organization' as const, label: 'Organization', icon: Database },
    { id: 'models' as const, label: 'AI Models', icon: Brain },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your organization, AI models, and profile</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {saved && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Settings saved successfully
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Organization */}
      {activeTab === 'organization' && (
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Organization Settings</h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Organization Name</label>
            <input
              type="text"
              value={settings.organization_name || tenantName}
              onChange={(e) => setSettings({ ...settings, organization_name: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Organization Slug</label>
            <input type="text" value={tenantSlug} disabled className="input-field bg-slate-50 text-slate-400" />
            <p className="mt-1 text-xs text-slate-400">Cannot be changed</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Default IRIS Namespace</label>
            <input
              type="text"
              value={settings.default_namespace || ''}
              onChange={(e) => setSettings({ ...settings, default_namespace: e.target.value || null })}
              className="input-field"
              placeholder="e.g., HB"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Auto-purge uploads after (days)</label>
            <input
              type="number"
              value={settings.auto_purge_uploads_days || ''}
              onChange={(e) => setSettings({ ...settings, auto_purge_uploads_days: e.target.value ? parseInt(e.target.value) : null })}
              className="input-field w-32"
              placeholder="Never"
              min={1}
            />
          </div>

          <button onClick={handleSaveSettings} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </button>
        </div>
      )}

      {/* AI Models */}
      {activeTab === 'models' && (
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">AI Model Configuration</h2>
          <p className="text-sm text-slate-500">Choose which Claude models to use for each pipeline stage</p>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Analysis Model
                <span className="ml-2 text-xs text-slate-400">Used for parsing and understanding source components</span>
              </label>
              <select
                value={settings.analysis_model || currentModels.analysis || ''}
                onChange={(e) => setSettings({ ...settings, analysis_model: e.target.value || null })}
                className="input-field"
              >
                <option value="">Default ({currentModels.analysis})</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.tier})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Code Generation Model
                <span className="ml-2 text-xs text-slate-400">Used for generating ObjectScript classes</span>
              </label>
              <select
                value={settings.codegen_model || currentModels.codegen || ''}
                onChange={(e) => setSettings({ ...settings, codegen_model: e.target.value || null })}
                className="input-field"
              >
                <option value="">Default ({currentModels.codegen})</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.tier})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                High Complexity Model
                <span className="ml-2 text-xs text-slate-400">Used for very_high complexity code generation</span>
              </label>
              <select
                value={settings.high_complexity_model || currentModels.high_complexity || ''}
                onChange={(e) => setSettings({ ...settings, high_complexity_model: e.target.value || null })}
                className="input-field"
              >
                <option value="">Default ({currentModels.high_complexity})</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.tier})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Available Models</h3>
            <div className="space-y-2">
              {models.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{m.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierBadge[m.tier] || tierBadge.standard}`}>
                    {m.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSaveSettings} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Model Settings
          </button>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Notification Settings</h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Webhook URL</label>
            <input
              type="url"
              value={settings.webhook_url || ''}
              onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value || null })}
              className="input-field"
              placeholder="https://hooks.slack.com/services/..."
            />
            <p className="mt-1 text-xs text-slate-400">Receives POST with JSON payload on events</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Notify on events:</h3>
            {[
              { key: 'notify_on_analysis' as const, label: 'Analysis completed', desc: 'When file analysis finishes' },
              { key: 'notify_on_deploy' as const, label: 'Deploy completed', desc: 'When code is deployed to IRIS' },
              { key: 'notify_on_test' as const, label: 'Tests completed', desc: 'When test suite finishes running' },
            ].map((item) => (
              <label key={item.key} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <button onClick={handleSaveSettings} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Notifications
          </button>
        </div>
      )}

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">User Profile</h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
            <input type="text" value={role} disabled className="input-field bg-slate-50 text-slate-400 capitalize" />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Change Password</h3>
            <div className="space-y-3">
              <div className="relative">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  minLength={8}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>
          </div>

          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Update Profile
          </button>
        </div>
      )}
    </div>
  )
}
