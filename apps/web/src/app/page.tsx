'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated } from '@/lib/auth'
import {
  Upload, Brain, GitBranch, Code, Server, FlaskConical,
  ArrowRight, CheckCircle, Zap, Shield, Globe,
} from 'lucide-react'

const features = [
  { icon: Upload, title: 'Upload Source Files', desc: 'JAR (Oracle SOA), XML (Mirth Connect), Rhapsody, BizTalk — all supported' },
  { icon: Brain, title: 'AI Analysis (Claude Opus)', desc: 'Automatic component discovery, complexity assessment, field-level mapping proposals' },
  { icon: GitBranch, title: 'Visual Mapping', desc: 'Interactive source → IRIS mapping with HL7 segment visualization' },
  { icon: Code, title: 'ObjectScript Generation', desc: 'Production-ready BS, BP, BO, DTL, MSG classes with validation' },
  { icon: Server, title: 'Deploy to IRIS', desc: 'One-click deployment via Atelier REST API with dependency ordering' },
  { icon: FlaskConical, title: 'Integration Testing', desc: 'MLLP, SOAP, HTTP test execution with ACK validation and results dashboard' },
]

const platforms = [
  'Mirth Connect', 'Oracle SOA/OSB', 'Rhapsody', 'BizTalk', 'Cloverleaf',
]

const plans = [
  { name: 'Trial', price: 'Free', period: '14 days', features: ['2 projects', '5 components', '10 code generations', 'Analysis + Mapping'], cta: 'Start Free Trial', highlight: false },
  { name: 'Professional', price: 'Contact us', period: 'per month', features: ['20 projects', '100 components', '500 code generations', 'Deploy + Testing + Export', 'Priority support'], cta: 'Contact Sales', highlight: true },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited everything', 'On-premise agent', 'Custom integrations', 'Dedicated support', 'SLA guarantee'], cta: 'Contact Sales', highlight: false },
]

export default function LandingPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    setAuthed(isAuthenticated())
  }, [])

  if (authed === true) {
    router.replace('/projects')
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 shadow-lg shadow-teal-600/20">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="text-xl font-bold text-slate-900">HealthBridge AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Login</Link>
            <Link href="/register" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700 mb-6">
            <Zap className="h-4 w-4" />
            Powered by Claude AI (Opus 4.6)
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 leading-tight">
            Migrate Healthcare Integrations<br />
            <span className="text-teal-600">to IRIS with AI</span>
          </h1>
          <p className="mt-6 text-lg lg:text-xl text-slate-500 max-w-3xl mx-auto">
            Automate migrations from Mirth Connect, Oracle SOA, Rhapsody, and BizTalk
            to InterSystems IRIS/TrackCare. Upload source files, let AI analyze and generate
            ObjectScript — deploy in minutes, not months.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="rounded-xl bg-teal-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-teal-700 shadow-lg shadow-teal-600/25 flex items-center gap-2">
              Start Free Trial <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="rounded-xl border-2 border-slate-200 px-8 py-3.5 text-base font-semibold text-slate-700 hover:border-slate-300">
              Login
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* Pipeline */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-4">Complete Migration Pipeline</h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">From source file upload to production deployment — fully automated with AI at every step.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Upload', 'Analyze', 'Map', 'Generate', 'Validate', 'Deploy', 'Test'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                  {step}
                </div>
                {i < 6 && <ArrowRight className="h-4 w-4 text-teal-400" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-12">Everything You Need</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 mb-4">
                  <f.icon className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Supported Source Platforms</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {platforms.map((p) => (
              <div key={p} className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                {p}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-400">All migrating to InterSystems IRIS / HealthConnect / TrackCare</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-4">Simple Pricing</h2>
          <p className="text-center text-slate-500 mb-12">Start with a free trial, upgrade when ready.</p>
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border-2 p-8 ${plan.highlight ? 'border-teal-500 shadow-xl shadow-teal-500/10' : 'border-slate-200'}`}>
                {plan.highlight && <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700 mb-4">Most Popular</span>}
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                  {plan.period && <span className="text-slate-400 ml-1">/{plan.period}</span>}
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-teal-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`mt-8 block text-center rounded-lg px-6 py-3 text-sm font-semibold ${plan.highlight ? 'bg-teal-600 text-white hover:bg-teal-700' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2 text-slate-500">
              <Shield className="h-5 w-5 text-teal-500" />
              <span className="text-sm font-medium">HIPAA Ready</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Globe className="h-5 w-5 text-teal-500" />
              <span className="text-sm font-medium">AWS Infrastructure</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Brain className="h-5 w-5 text-teal-500" />
              <span className="text-sm font-medium">Claude AI (Anthropic)</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to Migrate?</h2>
          <p className="text-slate-500 mb-8">Start your 14-day free trial. Upload your first integration file and see AI in action.</p>
          <Link href="/register" className="rounded-xl bg-teal-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-teal-700 shadow-lg shadow-teal-600/25 inline-flex items-center gap-2">
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-sm text-slate-400">
          <span>&copy; 2026 HealthBridge AI. All rights reserved.</span>
          <span>Built with Claude AI + InterSystems IRIS</span>
        </div>
      </footer>
    </div>
  )
}
