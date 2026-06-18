import { useState } from 'react'
import { MessageSquare, Brain, Route, Shield, ArrowRight, Loader2 } from 'lucide-react'

interface Props {
  onAuthed: (user: { id: string; email: string }) => void
}

const FEATURES = [
  { icon: Route, title: 'Smart Routing', desc: '28 AI providers, one interface' },
  { icon: Brain, title: 'Debate Mode', desc: 'Two models refine each other' },
  { icon: Shield, title: 'Private', desc: 'Your data stays on your server' },
  { icon: MessageSquare, title: 'Free Tier', desc: 'Chat without any API keys' },
]

export function Login({ onAuthed }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      onAuthed(data)
    } catch {
      setError('Could not reach the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-950 text-gray-100">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950/30">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
              OR
            </div>
            <span className="text-xl font-bold tracking-tight">Omni-Router</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Welcome to<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Omni-Router
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            One AI chat that routes across 28 providers — automatically picking the best model for every message.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-sm">
                  <Icon size={18} className="shrink-0 mt-0.5 text-blue-400" />
                  <div>
                    <div className="text-sm font-semibold">{f.title}</div>
                    <div className="text-xs text-gray-500">{f.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative z-10 text-xs text-gray-600">
          &copy; 2026 Khan-G &middot; MIT License
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo (hidden on desktop) */}
          <div className="md:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              OR
            </div>
            <span className="text-xl font-bold tracking-tight">Omni-Router</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-gray-500 mb-8">
            {mode === 'login'
              ? 'Sign in to continue to Omni-Router'
              : 'Get started with Omni-Router in seconds'}
          </p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              {mode === 'login'
                ? "Don't have an account? "
                : 'Already have an account? '}
              <span className="text-blue-400 font-medium">
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
