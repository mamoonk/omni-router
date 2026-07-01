import { useState, useEffect } from 'react'
import { ExternalLink, Eye, EyeOff, Save, CheckCircle, Key, Bot, Sliders, HelpCircle, Github, BookOpen, Mail, Heart, Globe, Download, Upload } from 'lucide-react'
import { ApiClient } from '../../lib/api'
import type { Settings } from '@shared/types'

interface Props {
  serverPort: number
  settings: Settings
  onUpdate: (partial: Partial<Settings>) => void
}

interface ProviderInfo {
  label: string
  envKey: string
  url: string
}

const PROVIDERS: ProviderInfo[] = [
  { label: 'Gemini', envKey: 'GEMINI_API_KEY', url: 'https://aistudio.google.com/apikey' },
  { label: 'Groq', envKey: 'GROQ_API_KEY', url: 'https://console.groq.com/keys' },
  { label: 'Mistral', envKey: 'MISTRAL_API_KEY', url: 'https://console.mistral.ai/api-keys' },
  { label: 'Cohere', envKey: 'COHERE_API_KEY', url: 'https://dashboard.cohere.com/api-keys' },
  { label: 'OpenAI', envKey: 'OPENAI_API_KEY', url: 'https://platform.openai.com/api-keys' },
  { label: 'Anthropic', envKey: 'ANTHROPIC_API_KEY', url: 'https://console.anthropic.com/settings/keys' },
  { label: 'DeepSeek', envKey: 'DEEPSEEK_API_KEY', url: 'https://platform.deepseek.com/api_keys' },
  { label: 'Together AI', envKey: 'TOGETHER_API_KEY', url: 'https://api.together.xyz/settings/api-keys' },
  { label: 'Fireworks AI', envKey: 'FIREWORKS_API_KEY', url: 'https://fireworks.ai/api-keys' },
  { label: 'OpenRouter', envKey: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/keys' },
  { label: 'NVIDIA NIM', envKey: 'NVIDIA_API_KEY', url: 'https://build.nvidia.com/' },
  { label: 'Perplexity', envKey: 'PERPLEXITY_API_KEY', url: 'https://www.perplexity.ai/settings/api' },
  { label: 'xAI Grok', envKey: 'XAI_API_KEY', url: 'https://console.x.ai/' },
  { label: 'Eden AI', envKey: 'EDEN_API_KEY', url: 'https://www.edenai.run/admin/apikeys' },
  { label: 'SiliconFlow', envKey: 'SILICONFLOW_API_KEY', url: 'https://siliconflow.cn/apikeys' },
  { label: 'HuggingFace', envKey: 'HUGGINGFACE_API_KEY', url: 'https://huggingface.co/settings/tokens' },
  { label: 'Cloudflare', envKey: 'CLOUDFLARE_API_KEY', url: 'https://dash.cloudflare.com/profile/api-tokens' },
  { label: 'DashScope (Qwen)', envKey: 'DASHSCOPE_API_KEY', url: 'https://dashscope.console.aliyun.com/' },
  { label: 'AI21 Labs', envKey: 'AI21_API_KEY', url: 'https://www.ai21.com/studio' },
  { label: 'Cerebras', envKey: 'CEREBRAS_API_KEY', url: 'https://inference.cerebras.ai/' },
  { label: 'SambaNova Cloud', envKey: 'SAMBANOVA_API_KEY', url: 'https://cloud.sambanova.ai/apis' },
  { label: 'DeepInfra', envKey: 'DEEPINFRA_API_KEY', url: 'https://deepinfra.com/dash/api_keys' },
  { label: 'Stability AI', envKey: 'STABILITY_API_KEY', url: 'https://platform.stability.ai/account/keys' },
  { label: 'Replicate', envKey: 'REPLICATE_API_KEY', url: 'https://replicate.com/account/api-tokens' },
  { label: 'Fal.ai', envKey: 'FALAI_API_KEY', url: 'https://fal.ai/dashboard/keys' },
  { label: 'Volcengine (Doubao)', envKey: 'VOLCENGINE_API_KEY', url: 'https://console.volcengine.com/ark' },
  { label: 'Zhipu AI (GLM)', envKey: 'ZHIPU_API_KEY', url: 'https://open.bigmodel.cn/usercenter/apikeys' },
  { label: 'Baidu Qianfan (ERNIE)', envKey: 'BAIDU_API_KEY', url: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application' },
  { label: 'Moonshot AI (Kimi)', envKey: 'MOONSHOT_API_KEY', url: 'https://platform.moonshot.ai/console/api-keys' }
]

type Tab = 'keys' | 'debate' | 'general' | 'help'

const TABS: { id: Tab; label: string; icon: typeof Key }[] = [
  { id: 'keys', label: 'API Keys', icon: Key },
  { id: 'debate', label: 'Debate', icon: Bot },
  { id: 'general', label: 'General', icon: Sliders },
  { id: 'help', label: 'Help', icon: HelpCircle },
]

export function SettingsPanel({ serverPort, settings, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('keys')
  const [keyValues, setKeyValues] = useState<Record<string, string>>({})
  const [keyStatuses, setKeyStatuses] = useState<Record<string, boolean>>({})
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const api = new ApiClient(serverPort)
    api.getApiKeys().then(setKeyStatuses).catch(() => {})
  }, [serverPort])

  const hasChanges = PROVIDERS.some((p) => {
    const current = keyValues[p.envKey] || ''
    const wasSet = keyStatuses[p.envKey]
    return (current !== '' && !wasSet) || (wasSet && current !== '')
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const api = new ApiClient(serverPort)
      const updated = await api.saveApiKeys(keyValues)
      setKeyStatuses(updated)
      setKeyValues({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // ignore
    }
    setSaving(false)
  }

  const toggleVisibility = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleExport = async () => {
    try {
      const api = new ApiClient(serverPort)
      const base64 = await api.exportApiKeys()
      if (window.electronAPI) {
        await window.electronAPI.saveFile(base64, 'myrouter-keys.json')
      } else {
        const blob = new Blob([base64], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'myrouter-keys.json'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch { /* ignore */ }
  }

  const handleImport = async () => {
    let content: string | null = null
    if (window.electronAPI) {
      content = await window.electronAPI.openFile()
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      content = await new Promise((resolve) => {
        input.onchange = async () => {
          const file = input.files?.[0]
          if (file) resolve(await file.text())
          else resolve(null)
        }
        input.click()
      })
    }
    if (!content) return
    try {
      const api = new ApiClient(serverPort)
      const updated = await api.importApiKeys(content.trim())
      setKeyStatuses(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
  }

  const configuredCount = Object.values(keyStatuses).filter(Boolean).length

  return (
    <div className="p-6 overflow-y-auto h-full max-w-3xl md:max-w-3xl w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        {activeTab === 'keys' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {configuredCount}/{PROVIDERS.length} configured
            </span>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle size={14} /> Saved
              </span>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Export keys to file"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Import keys from file"
            >
              <Upload size={14} />
              Import
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={15} />
              {saving ? 'Saving...' : 'Save Keys'}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'keys' && (
        <section className="mb-8">
          <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {PROVIDERS.map((p) => {
              const isVisible = visibleKeys.has(p.envKey)
              const isConfigured = keyStatuses[p.envKey]
              const hasValue = Boolean(keyValues[p.envKey])

              return (
                <div key={p.envKey} className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-900">
                  <span className="text-sm font-medium w-28 shrink-0">{p.label}</span>
                  <div className="flex-1 relative">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={keyValues[p.envKey] || ''}
                      onChange={(e) => {
                        setKeyValues((prev) => ({ ...prev, [p.envKey]: e.target.value }))
                      }}
                      placeholder={isConfigured ? '•••••••••• (replace key)' : `Enter ${p.label} API key...`}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 placeholder-gray-400"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={() => toggleVisibility(p.envKey)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
                        title={isVisible ? 'Hide' : 'Show'}
                      >
                        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      {isConfigured && !hasValue && (
                        <CheckCircle size={14} className="text-green-500 shrink-0" />
                      )}
                    </div>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.preventDefault(); window.open(p.url, '_blank', 'noopener,noreferrer') }}
                    className="shrink-0 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
                  >
                    Get key
                    <ExternalLink size={12} />
                  </a>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {activeTab === 'debate' && (
        <section className="mb-8">
          <h3 className="text-lg font-medium mb-3">Debate Configuration</h3>
          <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <label className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium">Multi-model debate mode</span>
                <p className="text-xs text-gray-500 mt-0.5">Two AI models discuss and refine each other's answers</p>
              </div>
              <input
                type="checkbox"
                checked={settings.debateEnabled}
                onChange={(e) => onUpdate({ debateEnabled: e.target.checked })}
                className="rounded"
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <span className="text-sm">Debate rounds</span>
              <select
                value={settings.debateRounds}
                onChange={(e) => onUpdate({ debateRounds: parseInt(e.target.value, 10) })}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm"
              >
                <option value={1}>1 round</option>
                <option value={2}>2 rounds</option>
              </select>
            </label>
            <label className="flex items-center justify-between py-2">
              <span className="text-sm">Primary (answerer)</span>
              <select
                value={settings.debatePrimaryProvider || ''}
                onChange={(e) => onUpdate({ debatePrimaryProvider: e.target.value || undefined })}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm max-w-[200px]"
              >
                <option value="">Auto (best match)</option>
                {PROVIDERS.map((p) => (
                  <option key={p.envKey} value={p.envKey.replace('_API_KEY', '').toLowerCase()}>{p.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between py-2">
              <span className="text-sm">Critic (reviewer)</span>
              <select
                value={settings.debateCriticProvider || ''}
                onChange={(e) => onUpdate({ debateCriticProvider: e.target.value || undefined })}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm max-w-[200px]"
              >
                <option value="">Auto (second best)</option>
                {PROVIDERS.map((p) => (
                  <option key={p.envKey} value={p.envKey.replace('_API_KEY', '').toLowerCase()}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      {activeTab === 'general' && (
        <section className="mb-8">
          <h3 className="text-lg font-medium mb-3">Display</h3>
          <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 mb-6">
            <label className="flex items-center justify-between py-2">
              <span className="text-sm">Show provider badge on messages</span>
              <input
                type="checkbox"
                checked={settings.showProviderBadge}
                onChange={(e) => onUpdate({ showProviderBadge: e.target.checked })}
                className="rounded"
              />
            </label>
          </div>

          <h3 className="text-lg font-medium mb-3">Performance</h3>
          <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <label className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium">Streaming responses</span>
                <p className="text-xs text-gray-500 mt-0.5">See tokens as they are generated</p>
              </div>
              <input
                type="checkbox"
                checked={settings.streamingEnabled}
                onChange={(e) => onUpdate({ streamingEnabled: e.target.checked })}
                className="rounded"
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium">Response caching (24h)</span>
                <p className="text-xs text-gray-500 mt-0.5">Reuse identical prompts to save costs</p>
              </div>
              <input
                type="checkbox"
                checked={settings.cacheEnabled}
                onChange={(e) => onUpdate({ cacheEnabled: e.target.checked })}
                className="rounded"
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium">Prompt compression</span>
                <p className="text-xs text-gray-500 mt-0.5">Reduce token usage by condensing context</p>
              </div>
              <input
                type="checkbox"
                checked={settings.compressionEnabled}
                onChange={(e) => onUpdate({ compressionEnabled: e.target.checked })}
                className="rounded"
              />
            </label>
            <hr className="border-gray-200 dark:border-gray-700" />
            <label className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium">Token optimizer</span>
                <p className="text-xs text-gray-500 mt-0.5">Auto-prunes old messages when approaching context window limits</p>
              </div>
              <input
                type="checkbox"
                checked={settings.tokenOptimization}
                onChange={(e) => onUpdate({ tokenOptimization: e.target.checked })}
                className="rounded"
              />
            </label>
            {settings.tokenOptimization && (
              <label className="flex items-center justify-between py-2">
                <span className="text-sm">Optimization threshold</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={30}
                    max={95}
                    value={settings.tokenOptimizationThreshold}
                    onChange={(e) => onUpdate({ tokenOptimizationThreshold: parseInt(e.target.value, 10) })}
                    className="w-24"
                  />
                  <span className="text-xs text-gray-500 w-8">{settings.tokenOptimizationThreshold}%</span>
                </div>
              </label>
            )}
          </div>
        </section>
      )}

      {activeTab === 'help' && (
        <section className="mb-8 space-y-6">
          {/* About */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                OR
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Omni-Router</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Version 1.0.0 &middot; MIT License</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  A multi-provider AI chat assistant with smart routing, quota management, debate mode, and a code agent.
                  Connects to 28 AI providers and automatically routes each message to the best model for the task.
                </p>
              </div>
            </div>
          </div>

          {/* Documentation */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-500" />
              Documentation
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <a href="https://github.com/mamoonk/omni-router/wiki" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <BookOpen size={18} className="text-gray-400 group-hover:text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Wiki &amp; Guides</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Installation, routing, providers, FAQ</div>
                </div>
                <ExternalLink size={14} className="ml-auto text-gray-400 shrink-0" />
              </a>
              <a href="https://github.com/mamoonk/omni-router/wiki/API-Keys" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <Key size={18} className="text-gray-400 group-hover:text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">API Key Setup</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">How to get and configure provider keys</div>
                </div>
                <ExternalLink size={14} className="ml-auto text-gray-400 shrink-0" />
              </a>
              <a href="https://github.com/mamoonk/omni-router/wiki/Routing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <Sliders size={18} className="text-gray-400 group-hover:text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Routing Strategies</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Smart, cheapest, fastest, round-robin</div>
                </div>
                <ExternalLink size={14} className="ml-auto text-gray-400 shrink-0" />
              </a>
              <a href="https://github.com/mamoonk/omni-router/wiki/FAQ" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                <HelpCircle size={18} className="text-gray-400 group-hover:text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">FAQ &amp; Troubleshooting</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Common questions and fixes</div>
                </div>
                <ExternalLink size={14} className="ml-auto text-gray-400 shrink-0" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Github size={18} className="text-gray-500" />
              Links
            </h3>
            <div className="flex flex-wrap gap-2">
              <a href="https://github.com/mamoonk/omni-router" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                <Github size={16} /> Source Code
              </a>
              <a href="https://github.com/mamoonk/omni-router/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                <HelpCircle size={16} /> Report Issue
              </a>
              <a href="https://github.com/mamoonk/omni-router/wiki/Development" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                <BookOpen size={16} /> Contributing
              </a>
              <a href="https://paypal.me/mrk827274" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-sm font-medium">
                <Heart size={16} /> Buy Me Tea
              </a>
            </div>
          </div>

          {/* Author */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">About the Author</h3>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                KG
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Khan-G</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Collective of Strategists, Creators &amp; Problem-Solvers</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  We are a collective of forward-thinking strategists, creators, and problem-solvers. Our strength lies in our collaborative synergy, allowing us to leverage our collective talent to push boundaries and deliver high-impact value.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <a href="https://github.com/mamoonk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    <Github size={15} /> github.com/mamoonk
                  </a>
                  <a href="mailto:mamoonk@gmail.com" className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    <Mail size={15} /> mamoonk@gmail.com
                  </a>
                  <a href="https://github.com/mamoonk/omni-router" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    <Globe size={15} /> Project Repository
                  </a>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 pt-2">
            Omni-Router &copy; 2026 Khan-G &middot; MIT License &middot; Built by a collective, for everyone
          </p>
        </section>
      )}
    </div>
  )
}
