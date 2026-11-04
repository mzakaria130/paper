# PAPER // LOCAL WORKSPACE DASHBOARD

> A local-first, privacy-respecting personal research & project dashboard styled after the [papertrade.xyz](https://exchange.papertrade.xyz) flat retro aesthetic. Zero cloud dependencies, 100% in-browser persistence, and an extensible agent/plugin architecture.

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)]()
[![Docker Ready](https://img.shields.io/badge/docker-ready-blue.svg)]()
[![Platform](https://img.shields.io/badge/platform-Universal%20%7C%20Self--Host-orange.svg)]()

---

## 📖 The Story & Development Journey

This project started from a simple frustration: **modern productivity dashboards have become bloated, fragile, and intrusive.** Most tools require third-party accounts, force continuous cloud sync, suffer from high latency, lock your data behind proprietary databases, and break as soon as your connection drops.

We wanted to build something fundamentally different:
- **Craftsmanship & Retro Flat Design**: Inspired by the tactile, outline-driven terminal aesthetic of [papertrade.xyz](https://exchange.papertrade.xyz), featuring a warm craft-paper palette, crisp monospace typography, and a seamless right-to-left running ASCII Bitcoin ticker.
- **Pure Local-First Privacy**: Your research, architecture roadmaps, trade logs, and notes are strictly yours. Everything lives in your browser's `localStorage`—zero tracking, zero cookies, zero external telemetry.
- **From Monolith to Modular Agent Engine**: What started as a single flat prototype has evolved into a clean, event-driven architecture (`src/core/bus.js`, `src/core/store.js`, `src/core/registry.js`). It allows autonomous coding and Web3 agents (like GrokBot, Muse, Flok, OpenClaw, and Hermes) to inspect, automate, and extend the workspace without messy hacks.

---

## 💡 The Core Idea & Philosophy

1. **Zero Lock-in Portability**: Run it locally on your laptop, host it on a \$3 Contabo/DigitalOcean VPS via Docker, or deploy it to a private Raspberry Pi. If your host goes down or increases pricing, your data moves with you in a single `.json` backup file.
2. **Tabular Productivity**: An Excel-like experience inside the browser. Capture raw research, promote findings to active projects with one click (`[ OK ]`), log degen trades and concentrated liquidity positions, and jot quick thoughts in a live scratchpad.
3. **Agent & Human Synergy**: Humans use the clean retro UI; autonomous agents use the machine-readable `AGENT.md` specifications and `window.PaperWorkspace` controller to audit contracts, run simulations, and journal strategies.

---

## 🏗️ Interactive Features & Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PAPER // WORKSPACE HEADER                       │
│     P// [LOCAL_READY]      [ ☩ MAP ]    [ ☾ / ☼ ]    [ 💾 DATA ]       │
└────────────────────────────────────────────────────────────────────────┘
                                 │
     ┌───────────────────────────┴───────────────────────────┐
     │ 1. RESEARCH CARD (Excel-Like Dynamic Table)           │
     │    - SOURCE | PROJECT | LINK | Dynamic Columns        │
     │    - [ + ADD ROW ] [ + ADD COL ] [ OK -> Promote ]    │
     ├───────────────────────────────────────────────────────┤
     │ 2. PROJECT CARD (Enrolled Engineering Specs)          │
     │    - # | PROJECT | SOURCE | STATUS | LINK             │
     │    - Hover preview popover & Popup Detail Modal       │
     ├───────────────────────────────────────────────────────┤
     │ 3. DEGEN // TRADE & LP JOURNAL (Crypto Strategy)      │
     │    - DATE | TYPE | PAIR/POOL | ACTION | SIZE | RANGE  │
     │    - Concentrated liquidity tracking & PnL logs       │
     ├───────────────────────────────────────────────────────┤
     │ 4. BUFFER // SCRATCHPAD (Full-Width Scratchpad)       │
     │    - Auto-saving editor with live word & char count   │
     │    - [ COPY ] [ TXT ↓ ] [ CLEAR ]                     │
     └───────────────────────────────────────────────────────┘
```

- **Visual Architecture & Brainstorming Map (`[ ☩ MAP ]`)**:
  A FigJam-style interactive retro canvas with draggable nodes, infinite pan & zoom, and dynamic wire connections. Switch between **Code Architecture** mode and a **Live Workspace Knowledge Graph**.
- **Mobile Responsive Burger Stack**:
  Clean navigation that preserves screen real estate on mobile devices with an outline dropdown menu.
- **Seamless ASCII Bitcoin Ticker**:
  Continuous right-to-left running background animation canvas with automatic tab sleep on background tabs.

---

## 🚀 How to Run & Use

### Quickstart (Local Node.js)
Requires **Node.js (v18+)** with zero external npm dependencies:

```bash
# 1. Clone the repository
git clone https://github.com/mzakaria130/paper.git
cd paper

# 2. Start the local server
node server.js
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

### Universal Host Deployment (Docker)
Works on any VPS (Contabo, DigitalOcean, Hetzner, AWS) or HomeLab:

```bash
# Run in background via Docker Compose
docker compose up -d
```
The application is served in a secure Alpine container (~50MB memory footprint).

---

## 🤖 Autonomous Agent Integration

This workspace is designed from the ground up for agentic workflows (GrokBot, Muse, Flok, OpenClaw, Hermes, Antigravity).

- **High-Priority Directive**: [`AGENT.md`](AGENT.md)
- **Machine Manifest**: [`.agent/manifest.json`](.agent/manifest.json)
- **Developer Manual**: [`docs/agents/AGENT_MANUAL.md`](docs/agents/AGENT_MANUAL.md)

### Programmatic Headless Controller
External agents running via Puppeteer, Playwright, or CLI scripts can control the workspace directly through the global browser handle:

```javascript
// Inspect workspace state
const projects = window.PaperWorkspace.store.get('projects');

// Execute an action
await window.PaperWorkspace.registry.executeAction('web3.mint', { contract: '0x...', amount: 1 });

// Dispatch audit findings into the project detail
window.PaperWorkspace.bus.emit('project:detail_saved', { id: 'proj_1', detail: 'Audit findings...' });
```

### Agent Bridge — local API + CLI/MCP (no browser automation)

For agents that should fill the dashboard without clicking forms, the server
exposes a tiny zero-dependency API backed by one canonical state file,
`paper-data.json` (gitignored — your personal data stays out of git):

- `GET /api/state` — current workspace state, or `{ "initialized": false }`
- `POST /api/state` — validate shape and atomically write `paper-data.json`

The browser store hydrates from `GET /api/state` on load and POSTs back on
change (debounced), with `localStorage` kept as a cache. Fills made while
the browser is closed therefore appear on the next reload.

The CLI/MCP bridge lives in [`tools/paper-bridge.mjs`](tools/paper-bridge.mjs)
and talks to that API. Requires `node server.js` running (default `:8080`).

```bash
# status + counts
node tools/paper-bridge.mjs status

# add rows (all mutations dedupe: research on project+link, project on
# name, journal on date+pair+action)
node tools/paper-bridge.mjs add-research --source "Cupang Ventures / X" --project "Feed The Fire" --link "https://feedfirereh.com/"
node tools/paper-bridge.mjs add-project --name "Feed The Fire" --source "Cupang Ventures / X" --link "https://feedfirereh.com/" --status ACTIVE --detail-file ./detail.txt
node tools/paper-bridge.mjs add-journal --date 2026-11-04 --type TRADE --pair "HYPE / USD" --action "LONG 20x" --size '$2,000' --pnl "+$100" --status CLOSED --notes "thesis"
node tools/paper-bridge.mjs set-notes --text-file ./notes.txt

# backup / restore (same v3 shape as the in-app [ DATA ] export)
node tools/paper-bridge.mjs export --out paper-data.json
node tools/paper-bridge.mjs import --in ./paper-data.json

# MCP over stdio (for Hermes / any MCP client)
node tools/paper-bridge.mjs mcp
```

MCP tools exposed: `paper_status`, `paper_get_state`, `paper_add_research`,
`paper_add_project`, `paper_add_journal`, `paper_set_notes`.

Starting state: copy [`paper-data.example.json`](paper-data.example.json)
(placeholders only) to `paper-data.json`, or import a backup through the
app's `[ DATA ]` modal. The API validates the v3 shape before writing:
`research{columns,rows}`, `projects[]`, `journal[]`, `notes` string.

Security note: this is a local-first workspace. The API has no auth by
design — run it on localhost / a trusted LAN only, never expose `:8080`
directly to the public internet, and keep `paper-data.json` out of git
(it is already in `.gitignore`).

---

## 🔮 Future Expectations & Development Roadmap

- [x] **Phase 1**: Outline design system recreation, ASCII Bitcoin canvas, and 3-card stack layout.
- [x] **Phase 2**: Modular ES Module refactor (`src/core/`, `src/modules/`, `src/agents/`).
- [x] **Phase 3**: Degen Trade & Concentrated Liquidity (LP) Journaling card.
- [x] **Phase 4**: Visual Architecture & Brainstorming node-graph canvas with FigJam-like pan/zoom.
- [x] **Phase 5**: Mobile responsive burger stack and universal Docker containerization.
- [ ] **Phase 6 (Upcoming)**:
  - **Local Web3 Wallet Connection**: Connect browser wallets (MetaMask/Rabby) via `src/adapters/web3.js` for one-click contract interaction.
  - **Automated Security Scanner**: Integration with Slither / Mythril CLI sidecars to output automated vulnerability matrices into the Project modal.
  - **Multi-Agent LP Supervisor**: Automated tick monitoring and impermanent loss risk alerts for concentrated liquidity pools.
  - **Encrypted Vault Mode**: Optional password-based AES encryption for exported JSON backups.

---

## 📄 License

MIT © [Mohammad Zakaria](https://github.com/mzakaria130)
