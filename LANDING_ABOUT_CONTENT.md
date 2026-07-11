# Landing & About Page — Content & Semantics Reference

This document is a **content and information-architecture spec**, not an implementation
guide. It exists so the Landing page (`/`) and About page (`/about`) can be rebuilt with
entirely new components/CSS without losing any copy, data, or the *meaning* each section
is supposed to convey.

Deliberately **excluded**: GSAP/animation code, Tailwind class names, exact CSS. Rebuild
those however you like — this file only tells you *what* has to exist and *why*.

Brand name: **ARC**. Tagline idea across both pages: bring your own API key, pay per
token instead of a flat subscription, own your data.

---

## 1. Global chrome

### NavBar (sticky, all pages)
- Logo: favicon mark + "ARC" wordmark → links home.
- Links: Features (`#features`), Models (`#models`), Pricing (`#pricing`),
  Claude Code (`#claude-code`) — all in-page anchors on the landing page — plus
  About (`/about`, a real route).
- Right side: theme toggle (light/dark), GitHub icon link <!-- (`github.com/<!-- rozengoza -->`) -->,
  and an auth-aware CTA:
  - Logged in → single "Open Chat" primary button.
  - Logged out → "Sign in" text link + "Get Started" primary button.
- Mobile: hamburger opens a dropdown with the same links + theme toggle + auth actions
  stacked.
- Semantic role: wayfinding + conversion (get the visitor into the product fast).

### Footer (all pages)
- Brand blurb: "A clean, self-hostable chat interface. Bring your own API key. Pay only
  for what you use." + GitHub profile link (`<!-- rozengoza -->`).
- **Product** column: Features, Models, Pricing, Claude Code (anchors) + About.
- **Resources** column:
  - Frontend (ARC UI) → `github.com/<!-- rozengoza -->/claude-chat-interface-make-chats-with-your-apikey`
  - Backend (API + DB) → `github.com/<!-- rozengoza -->/chat-interface-backend`
  - Documentation → repo README on the `development` branch
  - Get an API Key → `console.anthropic.com`
  - DeepSeek API Keys → `platform.deepseek.com/api_keys`
- **Legal** column: MIT License link + "Privacy-first: your keys never leave your
  browser" note.
- Bottom bar: "Built with ♥ by <!-- rozengoza --> · Open Source · MIT Licensed".

---

## 2. Landing page (`/`) — section order & content

Order: **Hero → Features → How It Works → Models → Pricing → Claude Code →
Open & Transparent → Footer**.

### 2.1 Hero
**Purpose:** first-impression value prop + primary conversion moment.

- Small pill badge above the headline: "Open Source · MIT · Self-hostable Backend"
  (with a live/pulsing dot).
- Headline (largest text on the page): "Bring Your Own **API Key.** Chat with the
  models **you** pay for." — the bolded/emphasized words ("API Key.", "you") are the
  ones that should carry the strongest visual treatment (color/gradient) since they
  carry the pitch.
- Subtitle: "No $20/month subscription. No surprise charges. Just you, your API key,
  and **22+ AI models** across every major provider — Anthropic, OpenAI, Google,
  DeepSeek, and more. Pay once per token, not once per month."
- Three CTAs, in priority order:
  1. Primary: "Open Chat" (logged in) / "Get Started Free" (logged out) →
     `/chat` or `/signup`.
  2. Secondary: "View on GitHub" → `github.com/<!-- rozengoza -->` (external).
  3. Tertiary/quiet: "About the API" → `/about`.
- Scroll-down affordance at the bottom of the viewport ("Scroll" + chevron).

### 2.2 Features — "Why ARC?"
**Purpose:** the core pitch, broken into scannable proof points, followed by a
qualifying "is this for you" gut-check.

- Eyebrow: "The Details". Heading: "Why ARC?" (ARC emphasized).
- Subtitle: "Most AI chat apps charge $20/month for a subscription — whether you use
  it or not. If you already have an API key, you're very likely overpaying. ARC plugs
  straight into your key with zero subscription fees."
- Six feature cards, each **icon + title + description**:
  1. **Bring Your Own Key** — "Your API key never touches our servers. It lives in
     your browser's memory and dies when you close the tab. Every request goes
     directly to the AI provider — zero middlemen."
  2. **Pay for What You Use** — "No $20/month subscription. Most developers spend
     under $5/month with API pricing. Use DeepSeek Flash at $0.14/MTok for casual
     chats, or Claude Opus at $5/MTok for complex reasoning — you control the cost."
  3. **22+ Models, One Interface** — "Anthropic. OpenAI. Google. DeepSeek. Groq.
     Mistral. xAI. OpenRouter. Ollama. Switch providers and models in one click — no
     need to manage multiple chat apps or subscriptions."
  4. **Instant Streaming** — "Token-by-token SSE streaming gives you real-time
     responses. No waiting for the full completion — see every word as it's
     generated, just like the native chat interfaces."
  5. **100% Transparent** — "Open source under MIT. Open DevTools, watch the network
     tab — every request goes to the AI provider and nowhere else. You don't have to
     trust us. That's the point."
  6. **Claude Code Ready** — "Use your API keys with Claude Code CLI. Run
     terminal-native coding sessions with the models you pay for. Set
     ANTHROPIC_API_KEY and go — ARC keys work everywhere."
- Sub-section: **"Is ARC right for you?"** — two contrasting lists (green = good fit,
  red = not a fit):
  - **Who this is for:**
    - Devs with an API key who don't want to pay $20/month for a chat UI
    - Anyone who hits free limits mid-work and wants to just continue
    - Developers who want full API access — longer context, no rate limits, custom
      prompts
    - Users who want to switch between models and providers freely
  - **Who this is not for:**
    - Non-developers without an API key from any provider
    - Heavy daily users where Pro pricing actually makes sense
    - Teams needing centralized billing (bring your own key is per-user)
    - Users who prefer managed authentication and key handling

### 2.3 How It Works
**Purpose:** remove onboarding friction anxiety — show it's 4 simple steps.

- Eyebrow: "Four Steps". Heading: "How It Works".
- Subtitle: "Four steps from landing page to AI-powered chat. No credit card, no
  subscription."
- Four sequential steps (numbered/connected visually, step 1 highlighted as "you are
  here"):
  1. **Create Account** — "Sign up with a username and password. No email required.
     Your profile stays local."
  2. **Add Your API Key** — "Paste your Anthropic, OpenAI, or DeepSeek key. It stays
     in your browser — never sent to our servers."
  3. **Choose Your Model** — "Pick from 22+ models across 9 providers. Switch anytime
     mid-conversation."
  4. **Start Chatting** — "Chat with the AI model of your choice. Pay only for the
     tokens you use. No subscriptions."

### 2.4 Models Showcase
**Purpose:** prove breadth of provider/model support; this is the "catalog" moment.

- Eyebrow: "9 Providers". Heading: "22+ Models, One Interface".
- Subtitle: "Bring the API key, pick your provider, and chat. From Claude Opus to
  local Ollama models — one unified chat experience."
- **Interactive requirement:** a provider switcher (tabs on desktop, prev/next +
  dot-indicator carousel on mobile) that filters the model grid below it to the
  selected provider's models. An auto-play mode cycles providers every 5s and pauses
  itself the moment the visitor manually picks a provider (manual interaction always
  wins over auto-play). A play/pause toggle plus "(X of N)" position indicator should
  be visible.
- Provider → models data (id / display name / context window in K tokens / free
  flag):
  - **Anthropic:** Claude Sonnet 4.6 (200K), Claude Haiku 4.5 (200K)
  - **OpenAI:** GPT-4o (128K), GPT-4o mini (128K)
  - **Google:** Gemini 2.5 Pro (1000K), Gemini 2.0 Flash (1000K)
  - **DeepSeek:** DeepSeek V3 / chat (64K), DeepSeek R1 / reasoner (64K)
  - **Groq:** Llama 3.3 70B (128K), Gemma 2 9B (8K)
  - **Mistral:** Mistral Large (32K), Mistral Small (32K)
  - **xAI:** Grok 3 (131K), Grok 3 Mini (131K)
  - **OpenRouter:** Llama 3.3 70B (OR) (128K), Claude 3.5 Sonnet (OR) (200K),
    Gemini 2.0 Flash (OR) (1000K)
  - **Gemini Free:** Gemini 2.0 Flash ✦ (1000K) — `free: true`
  - **Ollama (local):** Llama 3.2 (128K), Mistral 7B (32K), Qwen2.5 Coder 7B (32K)
- Each model card shows: provider icon, model name, a "FREE" badge when
  `free: true`, and "{context}K context window".

### 2.5 Pricing Comparison
**Purpose:** make the cost savings concrete and comparable, not just claimed.

- Eyebrow: "Pricing". Heading: "Pricing Compared".
- Subtitle: "DeepSeek vs Claude API pricing — see the cost difference and choose based
  on your needs. All prices are **per 1 million tokens**."
- Two side-by-side pricing tables (columns: Model / Input per MTok / Output per
  MTok):
  - **DeepSeek:**
    - deepseek-v4-flash (chat) — $0.14 in / $0.28 out — **highlighted "Best Value"**
      — cache hit $0.0028
    - deepseek-v4-pro (reasoner) — $0.435 in / $0.87 out
    - Footnote under the table: "💡 Cache hit: as low as $0.0028/MTok — 98% cheaper
      than standard input"
  - **Anthropic Claude:**
    - Claude Haiku 4.5 — $1.00 in / $5.00 out
    - Claude Sonnet 4.6 — $3.00 in / $15.00 out — **highlighted "Best Value"**
    - Claude Opus 4.8 — $5.00 in / $25.00 out
- **Real-World Cost Comparison** panel: "Per month, ~100 conversations with 2K input
  + 1K output tokens" — a bar chart comparing monthly cost:
  - Claude Pro (monthly): $20.00 — full-width reference bar (red)
  - ARC + DeepSeek Flash: ~$0.03 (green, ~0.15% width)
  - ARC + Claude Sonnet 4.6: ~$6.00 (accent, ~30% width)
  - ARC + Claude Opus 4.8: ~$10.00 (warm accent, ~50% width)
  - Callout line: "**200× cheaper** with DeepSeek for casual chats. Use **Claude** for
    complex reasoning where quality matters most."
- Closing tip: "💡 **Pro tip:** Claude offers **50% off with Batch API** and **~90%
  off input with Prompt Caching**. DeepSeek offers cache hits at just
  **$0.0028/MTok** (98% off)."

### 2.6 Claude Code integration
**Purpose:** speak directly to developer/CLI users — position ARC's API-key model as
also powering their terminal workflow, not just the web chat.

- Badge: "Pay As You Go". Heading: "API Keys Over Subscriptions".
- Subtitle: "ARC doesn't replace Claude Pro or ChatGPT Plus — it gives you a **better
  option**. Use the same API keys you already have, pay per token instead of per
  month, and keep full control over which models you use and when."
- Comparison banner (3 cards):
  - Claude Pro — "$20/month — unlimited? No."
  - ChatGPT Plus — "$20/month — capped at 40 messages/3h"
  - **ARC + Your API Key** (highlighted) — "~$0–10/month — pay per token, no cap"
- Four key points (icon + title + description):
  1. **Terminal-Native Coding** — "Run `claude` in your terminal. Claude Code reads
     your entire codebase, understands context, and helps you code faster — all with
     the API key you already have, not a separate subscription."
  2. **Multi-Provider Support** — "Set `ANTHROPIC_API_KEY` for Claude models,
     `DEEPSEEK_API_KEY` for DeepSeek, or use OpenRouter for unified access. One CLI,
     any provider — no need to manage multiple subscriptions."
  3. **Pay Per Token, Not Per Month** — "Claude Pro costs $20/month whether you use
     it or not. With ARC, you only pay for what you consume. Casual user spending
     ~$3/month on DeepSeek? Great. Power user spending $15/month on Opus? Still
     cheaper than Pro. **You control the cost.**"
  4. **Same Key, Anywhere** — "The API key you use in ARC works in Claude Code, the
     Anthropic SDK, LangChain, or any tool that speaks the Anthropic API. No vendor
     lock-in. Full portability."
- A terminal mockup demoing a realistic session (purely illustrative content, typed
  out line by line):
  ```
  $ export ANTHROPIC_API_KEY="sk-ant-..."
  $ export DEEPSEEK_API_KEY="sk-..."
  $ claude
  > Fix the authentication bug in auth.ts

  Claude Code • Opus 4.8 • analyzing codebase...
  ✓ Found issue in auth.ts:45 — JWT expiry not validated
  ✓ Applied fix: added expiry check before token refresh
  ✓ All 12 auth tests passing
  ```
- Bottom line: "💡 Already have an API key? ARC works with it instantly — no
  subscription, no credit card required. Don't have one yet? Grab a key from
  Anthropic (`console.anthropic.com`), OpenAI (`platform.openai.com/api-keys`), or
  DeepSeek (`platform.deepseek.com/api_keys`) in under a minute."

### 2.7 Open & Transparent
**Purpose:** trust/credibility close — open source, no telemetry, self-hostable.

- Eyebrow: "Transparency". Heading: "Open & Transparent".
- Subtitle: "ARC is fully open source under MIT. No hidden telemetry, no data
  collection, no enterprise-only features. Your API key talks directly to the AI
  provider from your browser — our servers never see it."
- Four stat tiles: **9** major AI providers · **22+** models across all providers ·
  **100%** keys never leave your browser · **~97%** potential savings vs.
  subscription.
- Differentiators list:
  - MIT licensed — inspect, fork, modify freely
  - No account required for API-only usage
  - Keys stored in your browser, never transmitted
  - Switch providers mid-conversation — no lock-in
- Self-host CTA card: "Self-Host Your Own Instance" — "Express + PostgreSQL on Neon.
  Docker, Fly.io, Render, and Railway configs included." → button "Self-Host the
  Backend" → `github.com/<!-- rozengoza -->/chat-interface-backend`.

---

## 3. About page (`/about`) — section order & content

**Purpose of the page as a whole:** the technical deep-dive for developers evaluating
whether to trust/deploy ARC — architecture, security model, API surface, and
self-hosting, in that order (progressively more "I want to run this myself").

Order: **Hero → Production Infrastructure → System Architecture → Auth & Encryption
Flow → API Reference → Import, Export & Continue → Zero-Cost Deployment → Footer**.

### 3.1 Hero
- Small circular "ARC" mark above the headline.
- Headline: "Multi-Provider Chat API".
- Subtitle: "Node.js · Express · PostgreSQL · SSE · JWT — stream AI completions,
  manage conversations, and own your data."
- Row of tech-stack pill badges: "Node ≥ 18", "PostgreSQL", "SSE Streaming",
  "MIT License", "Zero-Cost Deploy".

### 3.2 Production Infrastructure
- Eyebrow: "Infrastructure". Heading: "Production Infrastructure".
- Subtitle: "Node.js API · Encrypted storage · Hosted database · Import/export".
- Eight feature cards (icon + title + description):
  1. **AES-256-GCM Encryption** — "Messages encrypted at rest before storage. Keys
     derived per-user, never stored raw."
  2. **Neon PostgreSQL + Hashed Passwords** — "Serverless Postgres with
     bcrypt-hashed credentials. Neon Auth optional (RS256/JWKS)."
  3. **Your API Key, Your Privacy** — "Keys live in memory only for the duration of
     a request. Never logged, never persisted."
  4. **Express + Node.js API** — "RESTful backend with middleware pipeline: auth →
     rate-limit → proxy → stream → persist."
  5. **Import Chats** — "Bring your existing conversations from other apps. JSON
     import with automatic format detection."
  6. **Export & Continue** — "Export any chat as JSON or Markdown. Re-import later
     and pick up where you left off."
  7. **Provider Adapters** — "Unified completion endpoint. Swap Anthropic, OpenAI,
     DeepSeek — or add a new provider in one file."
  8. **Rate-Limited & Audited** — "Per-user daily quotas logged to
     rate_limit_log. Full request audit trail."

### 3.3 System Architecture
- Eyebrow: "Architecture". Heading: "System Architecture".
- Subtitle: "How data flows from your browser to the AI provider and back".
- A diagram (currently inline SVG) showing 4 nodes and the data flow between them —
  this is the semantic content the diagram must preserve, however it's redrawn:
  - **Frontend** — "ARC UI (React)"
  - **ARC Backend** — "Express · Node.js"
  - **Neon DB** — "PostgreSQL"
  - **AI Providers** — "Anthropic / OpenAI / …"
  - **Neon Auth** — "JWKS · RS256"
  - Flow edges: Frontend → Backend labeled "HTTPS+JWT"; Backend → Neon DB; Backend →
    AI Providers; Backend → Neon Auth.

### 3.4 Auth & Encryption Flow
- Eyebrow: "Security". Heading: "Auth & Encryption Flow".
- Subtitle: "How your data stays private from login to persistence".
- Six numbered steps (01–06), each **title + description**:
  1. **Client sends credentials** — "POST /auth/login with username + password.
     Password hashed with bcrypt before storage. In Neon Auth mode, RS256 JWT
     validated against JWKS endpoint."
  2. **JWT issued, session active** — "Local mode signs a HS256 JWT. Neon Auth mode
     validates RS256 tokens. User identity established for all subsequent requests."
  3. **Rate limit checked** — "Middleware verifies per-user daily quota against
     rate_limit_log table before forwarding to AI provider. Prevents abuse."
  4. **API key used in-memory only** — "Your provider API key is held in memory for
     the duration of the request. Never logged, never stored, never leaked."
  5. **Completion streamed via SSE** — "Backend proxies request to AI provider and
     pipes SSE event chunks to the frontend. Real-time, no polling."
  6. **Message encrypted & persisted** — "Full message pair encrypted with
     AES-256-GCM before storage in Neon PostgreSQL. Keys derived per-user. Chat
     survives reloads, page closes, and device switches."

### 3.5 API Reference
- Eyebrow: "API". Heading: "API Reference".
- Subtitle: "RESTful endpoints for chat management and AI completions".
- Table (Method / Endpoint / Notes), 11 rows:

  | Method | Endpoint | Notes |
  |---|---|---|
  | POST | `/auth/register` | `{ username, password }` → `{ token }` |
  | POST | `/auth/login` | `{ username, password }` → `{ token }` |
  | GET | `/auth/me` | Bearer → `{ user }` |
  | GET | `/chats` | List chats with message counts |
  | POST | `/chats` | `{ provider, model, title? }` |
  | GET | `/chats/:id` | Full chat + messages |
  | PATCH | `/chats/:id` | Rename: `{ title }` |
  | DELETE | `/chats/:id` | Cascades to messages |
  | POST | `/completion` | SSE stream · `{ chatId, messages, apiKey }` |
  | GET | `/health` | `{ ok: true }` · public |
  | GET | `/models` | Available model catalogue · public |

  Row coloring convention (semantic, keep if useful): POST = accent, GET = green,
  PATCH = orange, DELETE = red.

### 3.6 Import, Export & Continue
- Eyebrow: "Portability". Heading: "Import, Export & Continue".
- Subtitle: "Your conversations are portable — always".
- Two cards:
  - **Import Chats** — JSON import from any ARC-compatible export; automatic format
    detection & validation; messages restored with full metadata; drag-and-drop or
    file picker.
  - **Export & Continue** — export as JSON or Markdown; re-import exported chats to
    continue; share conversations in readable format; full conversation history
    preserved.

### 3.7 Zero-Cost Deployment
- Eyebrow: "Deploy". Heading: "Zero-Cost Deployment".
- Subtitle: "Production-ready in minutes — free tier included".
- Three deploy-option cards: **Fly.io** ("Global edge · fly.toml included"),
  **Render** ("Auto-deploy · render.yaml included"), **Railway** ("One-click deploy ·
  railway.toml").
- Four stat tiles: **0¢** hosting cost · **5** min to deploy · **3** deploy options ·
  **∞** chat history.
- Self-host CTA card: "Self-Host Your Own Instance" — "The entire ARC backend is open
  source under MIT. Fork it, deploy it, own your data. Express + PostgreSQL on Neon.
  Docker, Fly.io, Render, and Railway configs included." → button "View on GitHub —
  development" → `github.com/<!-- rozengoza -->/chat-interface-backend`.

---

## 4. Color/state semantics worth preserving

These meanings were carried by color across both pages — keep the *meaning* even if
the palette changes:

- **Accent** (brand primary) — primary actions, highlighted/"best value" items,
  Anthropic-related content.
- **Green** — success, free, GET requests, "who this is for", cheapest option.
- **Red** — danger/expensive baseline (Claude Pro's $20/mo bar), DELETE requests,
  "who this is not for".
- **Orange** — caution/rename-type actions (PATCH requests), Railway brand color.
- **Text-dim / text-muted** — secondary/supporting copy, de-emphasized metadata
  (timestamps, context-window sizes, endpoint notes).

## 5. Interaction requirements to carry forward (non-animation)

- Models Showcase: provider tab/carousel switching, auto-play with pause-on-manual-
  interaction, and a visible play/pause + position indicator.
- NavBar: scroll-aware background (transparent at top, solid/blurred once scrolled),
  responsive hamburger menu, theme toggle.
- All in-page nav links (`#features`, `#models`, `#pricing`, `#claude-code`) must
  correspond to an actual section `id` on the landing page for smooth-scroll linking
  to work, including from the Footer and from a direct URL hash on load.
