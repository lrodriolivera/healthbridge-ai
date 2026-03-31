'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.forgotPassword(email)
      setSuccess(true)
    } catch (err) {
      // Always show success to avoid email enumeration
      setSuccess(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-slate-900">Forgot your password?</h2>
      <p className="mb-6 text-sm text-slate-500">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {success ? (
        <div>
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            If the email exists, a reset link has been sent.
          </div>
          <Link href="/login" className="btn-primary inline-block w-full text-center">
            Back to Sign in
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Back to Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
