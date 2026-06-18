import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, BarChart3, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { Header } from './components/Layout/Header'
import { Sidebar } from './components/Layout/Sidebar'
import { ChatInterface } from './components/Chat/ChatInterface'
import { CodeInterface } from './components/Code/CodeInterface'
import { UsageDashboard } from './components/Dashboard/UsageDashboard'
import { SettingsPanel } from './components/Layout/SettingsPanel'
import { Login } from './components/Auth/Login'
import { useSettings } from './hooks/useSettings'

type View = 'chat' | 'code' | 'dashboard' | 'settings'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

function MobileNav({
  view,
  onViewChange
}: {
  view: View
  onViewChange: (v: View) => void
}) {
  const isWeb = !isElectron
  return (
    <nav className="mobile-only mobile-nav flex items-center justify-around border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
      <button
        onClick={() => onViewChange('chat')}
        className={`flex flex-col items-center gap-0.5 py-2 px-4 text-xs font-medium transition-colors ${
          view === 'chat'
            ? 'text-blue-500 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <MessageSquare size={20} />
        Chat
      </button>
      <button
        onClick={() => onViewChange('dashboard')}
        className={`flex flex-col items-center gap-0.5 py-2 px-4 text-xs font-medium transition-colors ${
          view === 'dashboard'
            ? 'text-blue-500 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <BarChart3 size={20} />
        Usage
      </button>
      <button
        onClick={() => onViewChange('settings')}
        className={`flex flex-col items-center gap-0.5 py-2 px-4 text-xs font-medium transition-colors ${
          view === 'settings'
            ? 'text-blue-500 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <SettingsIcon size={20} />
        Settings
      </button>
      {isWeb && (
        <button
          onClick={() => {
            fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => window.location.reload())
          }}
          className="flex flex-col items-center gap-0.5 py-2 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>
      )}
    </nav>
  )
}

export default function App() {
  const [serverPort, setServerPort] = useState(0)
  const [authChecked, setAuthChecked] = useState(isElectron)
  const [authedUser, setAuthedUser] = useState<{ id: string; email: string } | null>(null)
  const [view, setView] = useState<View>('chat')
  const [prevView, setPrevView] = useState<View>('chat')
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [mobileView, setMobileView] = useState<View>('chat')

  const { settings, updateSettings } = useSettings(serverPort)

  useEffect(() => {
    const init = async () => {
      if (window.electronAPI) {
        const port = await window.electronAPI.getServerPort()
        setServerPort(port)
        window.electronAPI.onServerPort((p) => setServerPort(p))
        return
      }
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          setAuthedUser(await res.json())
          setServerPort(1)
        }
      } finally {
        setAuthChecked(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!settings || settings.darkMode === undefined) return
    document.documentElement.classList.toggle('dark', settings.darkMode)
  }, [settings?.darkMode])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const OVERLAY_VIEWS: View[] = ['dashboard', 'settings']

  const handleViewChange = useCallback((next: View) => {
    setView((current) => {
      if (OVERLAY_VIEWS.includes(next) && current === next) {
        return prevView
      }
      if (OVERLAY_VIEWS.includes(next) && !OVERLAY_VIEWS.includes(current)) {
        setPrevView(current)
      }
      return next
    })
    setMobileView(next)
  }, [prevView])

  const onNewChat = useCallback(() => {
    setCurrentConversationId(null)
  }, [])

  const onConversationSaved = useCallback(() => {
    setRefreshSignal((s) => s + 1)
  }, [])

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
        <p>Connecting...</p>
      </div>
    )
  }

  if (!isElectron && !authedUser) {
    return (
      <Login
        onAuthed={(user) => {
          setAuthedUser(user)
          setServerPort(1)
        }}
      />
    )
  }

  if (!serverPort) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
        <p>Connecting...</p>
      </div>
    )
  }

  const renderContent = (v: View) => {
    switch (v) {
      case 'chat':
        return (
          <ChatInterface
            serverPort={serverPort}
            conversationId={currentConversationId}
            onConversationChange={setCurrentConversationId}
            showProviderBadge={settings?.showProviderBadge ?? true}
            streamingEnabled={settings?.streamingEnabled ?? true}
            projectId={selectedProjectId}
            onConversationSaved={onConversationSaved}
            routingStrategy={settings?.routingStrategy ?? 'smart'}
            onRoutingStrategyChange={(s) => updateSettings({ routingStrategy: s })}
            onViewChange={handleViewChange}
          />
        )
      case 'code':
        return isElectron ? (
          <CodeInterface
            serverPort={serverPort}
            onConversationSaved={onConversationSaved}
            projectId={selectedProjectId}
          />
        ) : null
      case 'dashboard':
        return <UsageDashboard serverPort={serverPort} />
      case 'settings':
        return (
          <SettingsPanel
            serverPort={serverPort}
            settings={settings}
            onUpdate={updateSettings}
          />
        )
    }
  }

  return (
    <>
      {/* Mobile layout */}
      <div className="mobile-only flex flex-col h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 safe-top">
        <div className="flex-1 overflow-hidden">
          {renderContent(mobileView)}
        </div>
        <MobileNav view={mobileView} onViewChange={handleViewChange} />
      </div>

      {/* Desktop layout */}
      <div className="desktop-only flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Sidebar
          serverPort={serverPort}
          currentConversationId={currentConversationId}
          onSelectConversation={setCurrentConversationId}
          onNewChat={onNewChat}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          refreshSignal={refreshSignal}
          view={view}
          onViewChange={handleViewChange}
        />
        <main className="flex-1 flex flex-col min-w-0">
          <Header
            view={view}
            onViewChange={handleViewChange}
            darkMode={settings?.darkMode ?? false}
            onToggleDarkMode={() => updateSettings({ darkMode: !(settings?.darkMode ?? false) })}
          />
          {renderContent(view)}
        </main>
      </div>
    </>
  )
}
