import { useState, useEffect } from 'react'
import { MessageSquare, Brain, Route, Shield, ArrowRight, Loader2, Eye, EyeOff, Sparkles, Zap, Globe, Sun, Moon } from 'lucide-react'

interface Props {
  onAuthed: (user: { id: string; email: string; name?: string; avatar?: string }) => void
}

const FEATURES = [
  { icon: Route, title: 'Smart Routing', desc: '28 AI providers, one interface', color: 'from-blue-500 to-cyan-500' },
  { icon: Brain, title: 'Debate Mode', desc: 'Two models refine each other', color: 'from-purple-500 to-pink-500' },
  { icon: Shield, title: 'Private & Secure', desc: 'Your data stays on your server', color: 'from-green-500 to-emerald-500' },
  { icon: MessageSquare, title: 'Free Tier', desc: 'Chat without any API keys', color: 'from-orange-500 to-amber-500' },
]

const GOOGLE_AVAILABLE = typeof window !== 'undefined' && !!(window as any).__GOOGLE_AUTH_ENABLED__

function GoogleButton({ loading, onClick, dark }: { loading: boolean; onClick: () => void; dark: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group ${dark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20' : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'}`}
    >
      {loading ? (
        <Loader2 size={18} className={`animate-spin ${dark ? 'text-gray-400' : 'text-gray-500'}`} />
      ) : (
        <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
      )}
      <span className={`text-sm font-medium transition-colors ${dark ? 'text-gray-200 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
        Continue with Google
      </span>
    </button>
  )
}

export function Login({ onAuthed }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const handleGoogle = () => {
    setGoogleLoading(true)
    window.location.href = '/api/auth/google'
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body: Record<string, string> = { email, password }
      if (mode === 'signup' && name.trim()) body.name = name.trim()

      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
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
    <div className={`min-h-screen flex overflow-hidden ${dark ? 'bg-[#080b14] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] ${dark ? 'bg-blue-600/10' : 'bg-blue-400/20'}`} />
        <div className={`absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] ${dark ? 'bg-purple-600/10' : 'bg-purple-400/15'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[100px] ${dark ? 'bg-indigo-900/5' : 'bg-indigo-200/30'}`} />
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setDark(!dark)}
        className={`fixed top-4 right-4 z-50 p-2.5 rounded-xl border transition-all duration-200 ${dark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-400 hover:text-gray-200' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-800 shadow-sm'}`}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Left panel */}
      <div className={`hidden lg:flex lg:w-[55%] flex-col justify-between p-14 relative ${dark ? '' : 'bg-white/60'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-xl shadow-blue-500/30">
            OR
          </div>
          <span className="text-lg font-bold tracking-tight">Omni-Router</span>
          <span className="ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">Beta</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">The future of AI chat</span>
          </div>
          <h1 className="text-5xl font-black leading-[1.1] mb-6 tracking-tight">
            One chat.<br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Every AI model.
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-10">
            Omni-Router intelligently routes your messages across 28 AI providers — automatically selecting the best model for speed, quality, or cost.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all duration-300 ${dark ? 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12]' : 'bg-gray-100/80 border-gray-200 hover:bg-gray-200/80'}`}
                >
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shrink-0 shadow-lg`}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-100">{f.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stats row */}
          <div className="mt-10 flex items-center gap-8">
            {[['28', 'AI Providers'], ['∞', 'Messages'], ['0', 'Data Sold']].map(([val, label]) => (
              <div key={label}>
                <div className="text-2xl font-black text-white">{val}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-gray-700">
          &copy; 2026 Khan-G &middot; MIT License
        </div>
      </div>

      {/* Divider */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent my-16" />

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-xl shadow-blue-500/30">
              OR
            </div>
            <span className="text-lg font-bold tracking-tight">Omni-Router</span>
          </div>

          {/* Mode tabs */}
          <div className={`flex p-1 rounded-2xl border mb-8 ${dark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-gray-100 border-gray-200'}`}>
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  mode === m
                    ? dark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                    : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Google button */}
          <GoogleButton loading={googleLoading} onClick={handleGoogle} dark={dark} />

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className={`flex-1 h-px ${dark ? 'bg-white/[0.08]' : 'bg-gray-200'}`} />
            <span className={`text-xs font-medium ${dark ? 'text-gray-600' : 'text-gray-400'}`}>or continue with email</span>
            <div className={`flex-1 h-px ${dark ? 'bg-white/[0.08]' : 'bg-gray-200'}`} />
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className={`block text-xs font-semibold mb-2 uppercase tracking-widest ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={`w-full px-4 py-3.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm ${dark ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                />
              </div>
            )}

            <div>
              <label className={`block text-xs font-semibold mb-2 uppercase tracking-widest ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full px-4 py-3.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm ${dark ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-2 uppercase tracking-widest ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                  className={`w-full px-4 py-3.5 pr-12 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm ${dark ? 'bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${dark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all duration-200 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Zap size={15} />
                  {mode === 'login' ? 'Sign in to Omni-Router' : 'Create your account'}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className={`mt-8 text-center text-xs leading-relaxed ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            By continuing, you agree to our{' '}
            <span className="text-gray-400 cursor-default">Terms of Service</span>
            {' '}and{' '}
            <span className="text-gray-400 cursor-default">Privacy Policy</span>.
          </p>

          <div className={`mt-6 flex items-center justify-center gap-4 text-xs ${dark ? 'text-gray-700' : 'text-gray-400'}`}>
            <div className="flex items-center gap-1.5">
              <Globe size={11} />
              <span>28 providers</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-700" />
            <div className="flex items-center gap-1.5">
              <Shield size={11} />
              <span>End-to-end encrypted keys</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
