import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HealthBridge AI',
  description: 'Healthcare integration migration platform powered by AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans">
        {children}
      </body>
    </html>
  )
}
