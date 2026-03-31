'use client'

import { useState, useEffect, FormEvent } from 'react'
import { api } from '@/lib/api'
import { Shield, Users, Building2, CreditCard, Plus, ChevronDown } from 'lucide-react'

type Tab = 'tenants' | 'create-tenant' | 'create-user' | 'plans'

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  is_active: boolean
  user_count: number
  trial_expires_at: string | null
  created_at: string
}

const PLAN_OPTIONS = ['trial', 'starter', 'professional', 'enterprise']

const PLAN_BADGE_CLASSES: Record<string, string> = {
  trial: 'bg-amber-100 text-amber-700 border-amber-200',
  starter: 'bg-blue-100 text-blue-700 border-blue-200',
  professional: 'bg-purple-100 text-purple-700 border-purple-200',
  enterprise: 'bg-teal-100 text-teal-700 border-teal-200',
}

const PLAN_LIMITS: Record<string, { projects: string; users: string; storage: string; ai_calls: string; support: string }> = {
  trial: { projects: '1', users: '2', storage: '100 MB', ai_calls: '50/month', support: 'Community' },
  starter: { projects: '5', users: '5', storage: '1 GB', ai_calls: '500/month', support: 'Email' },
  professional: { projects: '25', users: '20', storage: '10 GB', ai_calls: '5,000/month', support: 'Priority' },
  enterprise: { projects: 'Unlimited', users: 'Unlimited', storage: '100 GB', ai_calls: 'Unlimited', support: 'Dedicated' },
}

function PlanBadge({ plan }: { plan: string }) {
  const classes = PLAN_BADGE_CLASSES[plan] || 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {plan}
    </span>
  )
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tenants')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create tenant form
  const [ctName, setCtName] = useState('')
  const [ctEmail, setCtEmail] = useState('')
  const [ctPassword, setCtPassword] = useState('')
  const [ctPlan, setCtPlan] = useState('trial')
  const [ctTrialDays, setCtTrialDays] = useState(14)
  const [ctLoading, setCtLoading] = useState(false)
  const [ctSuccess, setCtSuccess] = useState('')
  const [ctError, setCtError] = useState('')

  // Create user form
  const [cuEmail, setCuEmail] = useState('')
  const [cuPassword, setCuPassword] = useState('')
  const [cuRole, setCuRole] = useState('member')
  const [cuTenantId, setCuTenantId] = useState('')
  const [cuLoading, setCuLoading] = useState(false)
  const [cuSuccess, setCuSuccess] = useState('')
  const [cuError, setCuError] = useState('')

  // Plan change dropdown
  const [planDropdownOpen, setPlanDropdownOpen] = useState<string | null>(null)

  useEffect(() => {
    loadTenants()
  }, [])

  async function loadTenants() {
    setLoading(true)
    try {
      const data = await api.listTenants()
      setTenants(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(tenantId: string) {
    try {
      await api.toggleTenantActive(tenantId)
      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, is_active: !t.is_active } : t))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle tenant')
    }
  }

  async function handleChangePlan(tenantId: string, newPlan: string) {
    try {
      await api.updateTenantPlan(tenantId, { plan: newPlan })
      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, plan: newPlan } : t))
      )
      setPlanDropdownOpen(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change plan')
    }
  }

  async function handleCreateTenant(e: FormEvent) {
    e.preventDefault()
    setCtError('')
    setCtSuccess('')
    setCtLoading(true)
    try {
      await api.createTenant({
        tenant_name: ctName,
        admin_email: ctEmail,
        admin_password: ctPassword,
        plan: ctPlan,
        trial_days: ctTrialDays,
      })
      setCtSuccess(`Tenant "${ctName}" created successfully.`)
      setCtName('')
      setCtEmail('')
      setCtPassword('')
      setCtPlan('trial')
      setCtTrialDays(14)
      loadTenants()
    } catch (err) {
      setCtError(err instanceof Error ? err.message : 'Failed to create tenant')
    } finally {
      setCtLoading(false)
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault()
    setCuError('')
    setCuSuccess('')
    setCuLoading(true)
    try {
      await api.createUser({
        email: cuEmail,
        password: cuPassword,
        role: cuRole,
        tenant_id: cuTenantId,
      })
      setCuSuccess(`User "${cuEmail}" created successfully.`)
      setCuEmail('')
      setCuPassword('')
      setCuRole('member')
      setCuTenantId('')
    } catch (err) {
      setCuError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCuLoading(false)
    }
  }

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: 'tenants', label: 'Tenants', icon: Building2 },
    { key: 'create-tenant', label: 'Create Tenant', icon: Plus },
    { key: 'create-user', label: 'Create User', icon: Users },
    { key: 'plans', label: 'Plans', icon: CreditCard },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
          <Shield className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Admin Panel</h1>
          <p className="text-sm text-slate-500">Manage tenants, users, and plans</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tenants Tab */}
      {activeTab === 'tenants' && (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600/30 border-t-primary-600" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No tenants found. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Slug</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Plan</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Active</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Users</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Trial Expires</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Created</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{tenant.name}</td>
                      <td className="px-4 py-3 text-slate-500">{tenant.slug}</td>
                      <td className="px-4 py-3">
                        <PlanBadge plan={tenant.plan} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(tenant.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            tenant.is_active ? 'bg-green-500' : 'bg-red-400'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              tenant.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{tenant.user_count ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {tenant.trial_expires_at
                          ? new Date(tenant.trial_expires_at).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setPlanDropdownOpen(
                                planDropdownOpen === tenant.id ? null : tenant.id
                              )
                            }
                            className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                          >
                            Change Plan
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {planDropdownOpen === tenant.id && (
                            <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              {PLAN_OPTIONS.map((plan) => (
                                <button
                                  key={plan}
                                  onClick={() => handleChangePlan(tenant.id, plan)}
                                  className={`block w-full px-4 py-2 text-left text-sm capitalize hover:bg-slate-50 ${
                                    tenant.plan === plan
                                      ? 'font-medium text-primary-600'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  {plan}
                                </button>
                              ))}
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

      {/* Create Tenant Tab */}
      {activeTab === 'create-tenant' && (
        <div className="card mx-auto max-w-lg p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create New Tenant</h2>

          {ctSuccess && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {ctSuccess}
            </div>
          )}
          {ctError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {ctError}
            </div>
          )}

          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Tenant Name
              </label>
              <input
                type="text"
                required
                value={ctName}
                onChange={(e) => setCtName(e.target.value)}
                className="input-field"
                placeholder="Hospital or organization name"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={ctEmail}
                onChange={(e) => setCtEmail(e.target.value)}
                className="input-field"
                placeholder="admin@organization.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Admin Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={ctPassword}
                onChange={(e) => setCtPassword(e.target.value)}
                className="input-field"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Plan</label>
                <select
                  value={ctPlan}
                  onChange={(e) => setCtPlan(e.target.value)}
                  className="input-field"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Trial Days
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={ctTrialDays}
                  onChange={(e) => setCtTrialDays(Number(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>

            <button type="submit" disabled={ctLoading} className="btn-primary w-full">
              {ctLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </span>
              ) : (
                'Create Tenant'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Create User Tab */}
      {activeTab === 'create-user' && (
        <div className="card mx-auto max-w-lg p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create New User</h2>

          {cuSuccess && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {cuSuccess}
            </div>
          )}
          {cuError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cuError}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={cuEmail}
                onChange={(e) => setCuEmail(e.target.value)}
                className="input-field"
                placeholder="user@organization.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={cuPassword}
                onChange={(e) => setCuPassword(e.target.value)}
                className="input-field"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
              <select
                value={cuRole}
                onChange={(e) => setCuRole(e.target.value)}
                className="input-field"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tenant</label>
              <select
                value={cuTenantId}
                onChange={(e) => setCuTenantId(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Select a tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
              {tenants.length === 0 && !loading && (
                <p className="mt-1 text-xs text-slate-400">
                  No tenants available. Create a tenant first.
                </p>
              )}
            </div>

            <button type="submit" disabled={cuLoading} className="btn-primary w-full">
              {cuLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </span>
              ) : (
                'Create User'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600">Feature</th>
                  {PLAN_OPTIONS.map((plan) => (
                    <th key={plan} className="px-4 py-3 text-center">
                      <PlanBadge plan={plan} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['projects', 'users', 'storage', 'ai_calls', 'support'] as const).map((feature) => (
                  <tr key={feature} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium capitalize text-slate-700">
                      {feature.replace('_', ' ')}
                    </td>
                    {PLAN_OPTIONS.map((plan) => (
                      <td key={plan} className="px-4 py-3 text-center text-slate-600">
                        {PLAN_LIMITS[plan][feature]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
