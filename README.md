# Omni-Router

Multi-provider AI chat assistant with smart routing, quota management, debate mode, and a code agent — all running locally as an Electron desktop app.

![Electron](https://img.shields.io/badge/platform-Electron-47848F) ![React](https://img.shields.io/badge/ui-React-61DAFB) ![Express](https://img.shields.io/badge/server-Express-000000) ![SQLite](https://img.shields.io/badge/db-SQLite-003B57)

---

## Features

### Multi-Provider Chat
Route each message to the best provider for the job. Omni-Router supports **20 providers**:

| Provider | Tier | Models |
|---|---|---|
| Gemini | 1 | Gemini 2.5 Flash, Gemini 2.5 Flash Lite, Imagen 3.0 |
| Groq | 1 | Llama 3.3 70B, Mixtral 8x7B |
| Cerebras | 1 | Llama 3.3 70B |
| HuggingFace | 1 | Llama 3.3 70B, Mistral 7B |
| Cloudflare | 1 | Llama 3.3 70B |
| Mistral | 2 | Mistral Small, Open Mistral 7B |
| Cohere | 2 | Command R, Command R+ |
| DeepSeek | 2 | DeepSeek V3 |
| Together AI | 2 | Llama 3.1 8B, Mixtral 8x22B |
| Fireworks AI | 2 | Llama 3.1 8B, Mixtral 8x7B |
| OpenRouter | 2 | Llama 3.3 70B, Mistral Small 3.1 |
| NVIDIA NIM | 2 | Nemotron 3 Super |
| Perplexity | 2 | Sonar Pro |
| xAI Grok | 2 | Grok 2 |
| Eden AI | 2 | GPT-4o Mini (via Eden) |
| SiliconFlow | 2 | Qwen 2.5 7B |
| DashScope (Qwen) | 2 | Qwen Plus, Qwen Turbo |
| AI21 Labs | 2 | Jamba 1.5 Mini, Jamba 1.5 Large |
| OpenAI | 3 | GPT-4o Mini, GPT-4o |
| Anthropic | 3 | Claude 3 Haiku, Claude 3.5 Sonnet |

### Smart Routing Strategies
Four routing strategies decide where each message goes:

- **Smart** (default) — Scores providers by intent fitness, remaining quota, speed, and failure history
- **Cheapest** — Prioritizes lower-tier providers to minimize cost
- **Fastest** — Prioritizes low-latency providers
- **Round Robin** — Cycles evenly through all available providers

### Intent Classification
Messages are automatically classified into one of five intents before routing:
- **Factual** — Questions about facts, definitions, explanations
- **Code** — Programming tasks, function writing, debugging
- **Long Document** — Messages over 4000 characters
- **Creative** — Brainstorming, writing, open-ended tasks
- **Image** — Image generation requests (targets Imagen / Gemini)

### Provider Failover & Degradation
If a provider returns a 429 (rate-limited) or other error, the router:
1. Marks it degraded with a configurable cooldown (30s default, 60s for non-429)
2. Falls through to the next-best provider by score
3. Retries via exponential backoff queue (30s, 60s, 120s, max 3 attempts)

### Usage Quotas
Per-provider rate limits are enforced in-memory with SQLite-backed tracking:
- **RPM** (Requests Per Minute)
- **TPM** (Tokens Per Minute)
- **Daily token cap**
- All visualized in the Usage Dashboard with real-time quota bars

### Response Caching
Identical prompts are cached for 24 hours via SHA-256 hashing:
- Avoids redundant API calls
- Reduces cost for repeated queries
- Configurable toggle in Settings

### Context Optimization
Two optimization layers keep context within model windows:

- **Compression** — Normalizes whitespace and strips system prompt boilerplate
- **History Trimming** — Intelligently removes the least important messages when approaching the context window threshold (configurable 30–95%)

### Debate Mode
Two AI models discuss and refine each other's answers:
- **Primary** (answerer) generates an initial response
- **Critic** (reviewer) identifies errors, gaps, and improvement areas
- **Refinement** round produces the final answer
- Configurable: 1–2 rounds, auto or manual provider selection

### Self-Improvement Agent
The app can read and modify its own source code:
- Scans the entire codebase (max depth 4, excludes `node_modules`/`.git`/`dist`)
- Keyword-matches relevant files by name and content
- Injects them into the prompt as context
- Writes file changes via `<edits>` JSON blocks

### External Project Agent (Code tab)
Same coding agent capabilities for any project on disk:
- Supports 25+ code file extensions
- Tree view of the project structure
- Built-in file editor
- Path-safe file writing (prevents directory traversal, protects `.git`/`node_modules`/`out`)

### Image Generation
Gemini's Imagen model is available for image generation:
- Text-to-image via Imagen 3.0
- Displays generated images inline in chat

### Activity Steps
While the router processes a request, real-time activity steps stream to the UI:
- Provider ranking, cache lookups, compression, tool usage, and debate rounds
- Expandable trace on each assistant message

### Projects
Organize conversations into named projects:
- Create, rename, and delete projects
- Conversations belong to a project
- Filter sidebar by project

### Usage Dashboard
Visual overview of:
- Per-provider quota bars (RPM, TPM, daily tokens remaining)
- Tokens saved via caching and compression
- Cost avoided vs GPT-4/GPT-4o rates
- Auto-refreshes every 5 seconds

### SSE Streaming
All chat responses stream token-by-token via Server-Sent Events, showing:
- The provider and model serving the request
- Activity steps in real time
- Debate rounds as they complete

---

## Getting Started

### Quick Install

**macOS / Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/mamoonk/omni-router/master/install.sh | bash
```

**Windows (PowerShell)**
```powershell
iwr -Uri https://raw.githubusercontent.com/mamoonk/omni-router/master/install.ps1 | iex
```

### Manual Setup

**Prerequisites:** Node.js 18+, npm, git

```bash
git clone https://github.com/mamoonk/omni-router.git
cd omni-router
npm install
npm run build
```

### Development

```bash
npm run dev
```

Launches the Electron app with hot-reload for both the renderer (React) and main (Electron/Express) processes.

### Web Server

```bash
npm run build:web && npm run start:web
```

### Build

```bash
npm run build
```

Produces a production build in `out/`.

### Preview

```bash
npm run preview
```

Runs the production build locally.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Electron Window                    │
│  ┌─────────────────────────────────────────────────┐ │
│  │              React Renderer (Vite)               │ │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │ │
│  │  │ Sidebar  │ │  Header  │ │  Main Content     │  │ │
│  │  │          │ │ Chat/Code│ │  Chat / Code /    │  │ │
│  │  │ Projects │ │   Tabs   │ │  Dashboard /      │  │ │
│  │  │  Chats   │ │          │ │  Settings         │  │ │
│  │  └─────────┘ └──────────┘ └──────────────────┘  │ │
│  └─────────────────────────────────────────────────┘ │
│                          │ IPC                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │            Electron Main Process                 │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │         Express HTTP Server (:0)             │ │ │
│  │  │  /api/chat     → Router + Providers          │ │ │
│  │  │  /api/settings → Key-Value Store             │ │ │
│  │  │  /api/quota    → Rate Limit Status           │ │ │
│  │  │  /api/projects → Project CRUD                │ │ │
│  │  │  /api/code     → File Tree + Edits           │ │ │
│  │  │  /api/status   → Global Stats                │ │ │
│  │  │  /api/dashboard→ Quota + Savings             │ │ │
│  │  └─────────────────────────────────────────────┘ │
│  │  ┌─────────────────────────────────────────────┐ │
│  │  │            SQLite (better-sqlite3)           │ │
│  │  │  quota_log | response_cache | conversations  │ │
│  │  │  messages | projects | settings              │ │
│  │  └─────────────────────────────────────────────┘ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Tech Stack
- **Desktop Shell:** Electron 33
- **Frontend:** React 19, TypeScript, Tailwind CSS, TanStack React Query
- **Backend:** Express 4 (in-process HTTP server)
- **Database:** SQLite via better-sqlite3 (WAL mode)
- **Build:** electron-vite, Vite 6

---

## Configuration

### API Keys
Set keys via the Settings UI or by editing `%APPDATA%/omni-router/.env`:
```
GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

### Settings (SQLite-backed)
| Setting | Default | Description |
|---|---|---|
| `routingStrategy` | `smart` | `smart`, `cheapest`, `fastest`, `roundrobin` |
| `streamingEnabled` | `true` | Token-by-token streaming |
| `cacheEnabled` | `true` | 24-hour response caching |
| `compressionEnabled` | `true` | Whitespace/boilerplate compression |
| `tokenOptimization` | `false` | Auto-history trimming |
| `tokenOptimizationThreshold` | `70` | Context window % to trigger trimming |
| `showProviderBadge` | `true` | Show provider/model on messages |
| `debateEnabled` | `false` | Multi-model debate mode |
| `debateRounds` | `1` | Number of debate rounds |

---

## Project Structure

```
src/
├── main/                          # Electron main process
│   ├── index.ts                   # Window creation + IPC handlers
│   └── server/
│       ├── index.ts               # Express server entry
│       ├── db/
│       │   ├── index.ts           # SQLite CRUD
│       │   └── schema.sql         # Table definitions
│       ├── routes/
│       │   ├── chat.ts            # SSE streaming + conversation CRUD
│       │   ├── code.ts            # File tree + project edits
│       │   ├── dashboard.ts       # Usage dashboard data
│       │   ├── projects.ts        # Project CRUD
│       │   ├── quota.ts           # Quota status
│       │   ├── self-improve.ts    # Self-improve file writes
│       │   ├── settings.ts        # Settings + API keys
│       │   └── status.ts          # Global stats
│       └── services/
│           ├── cache.ts           # SHA-256 response cache
│           ├── classifier.ts      # Intent classification
│           ├── codebase.ts        # Self-improve code reader
│           ├── compressor.ts      # Prompt compression
│           ├── debate.ts          # Multi-model debate
│           ├── envManager.ts      # .env file management
│           ├── metrics.ts         # Optimization counters
│           ├── optimizer.ts       # History trimming
│           ├── projectAgent.ts    # External project agent
│           ├── providers/
│           │   ├── adapter.ts     # Base provider adapter
│           │   ├── factory.ts     # Adapter factory
│           │   ├── registry.ts    # 20 provider configs
│           │   ├── gemini.ts      # Gemini + Imagen
│           │   ├── anthropic.ts   # Claude
│           │   ├── mistral.ts     # Mistral
│           │   ├── cohere.ts      # Command R
│           │   ├── huggingface.ts # HF Inference
│           │   ├── cloudflare.ts  # Cloudflare Workers AI
│           │   ├── ai21.ts        # Jamba
│           │   └── openai-compatible.ts  # Universal OpenAI-compat
│           ├── queue.ts           # Retry queue
│           ├── quota.ts           # Rate limit tracking
│           └── router.ts          # Smart request router
├── preload/
│   └── index.ts                   # Context bridge (IPC)
└── renderer/                      # React frontend
    ├── index.html
    └── src/
        ├── main.tsx               # React entry
        ├── App.tsx                # Root component
        ├── assets/main.css        # Tailwind + animations
        ├── lib/api.ts             # HTTP API client
        ├── hooks/
        │   ├── useChat.ts         # Chat state + SSE
        │   └── useSettings.ts     # Settings state
        ├── types/electron.d.ts    # Window.electronAPI types
        └── components/
            ├── Chat/              # Chat interface
            ├── Code/              # Code agent interface
            ├── Dashboard/         # Usage dashboard
            └── Layout/            # Sidebar, Header, Settings
shared/
└── types.ts                       # Shared TypeScript types
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development with hot reload |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |
| `npm run postinstall` | Install Electron-native deps |

---

## License

MIT
