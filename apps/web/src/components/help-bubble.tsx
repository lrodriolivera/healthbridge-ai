'use client'

import { useState } from 'react'
import { HelpCircle, X, Globe } from 'lucide-react'

interface HelpContent {
  es: { title: string; steps: string[] }
  en: { title: string; steps: string[] }
}

interface HelpBubbleProps {
  content: HelpContent
}

export default function HelpBubble({ content }: HelpBubbleProps) {
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<'es' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('help-lang') as 'es' | 'en') || 'es'
    }
    return 'es'
  })

  function toggleLang() {
    const next = lang === 'es' ? 'en' : 'es'
    setLang(next)
    localStorage.setItem('help-lang', next)
  }

  const data = content[lang]

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition-all hover:scale-110"
        title={lang === 'es' ? 'Ayuda' : 'Help'}
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </button>

      {/* Help panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-teal-600 px-4 py-3 rounded-t-2xl dark:border-slate-700">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-teal-100" />
              <span className="text-sm font-semibold text-white">
                {lang === 'es' ? 'Ayuda' : 'Help'}
              </span>
            </div>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 rounded-full bg-teal-500/30 px-2.5 py-1 text-xs font-medium text-teal-100 hover:bg-teal-500/50 transition-colors"
            >
              <Globe className="h-3 w-3" />
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {data.title}
            </h3>
            <ol className="space-y-2.5">
              {data.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
