'use client'

import { useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { api } from '@/lib/api'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate(): string | null {
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter.'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      await api.resetPassword(token, password)
      router.push('/login?message=Password+reset+successful.+Please+sign+in.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div>
        <h2 className="mb-1 text-xl font-semibold text-slate-900">Invalid Reset Link</h2>
        <p className="mb-6 text-sm text-slate-500">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="btn-primary inline-block w-full text-center">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-slate-900">Reset your password</h2>
      <p className="mb-6 text-sm text-slate-500">Enter your new password below.</p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
            New Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="At least 8 characters, letter + number"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
            Confirm Password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            placeholder="Re-enter your password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Resetting...
            </span>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Back to Sign in
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600/30 border-t-primary-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
