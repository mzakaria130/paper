# AGENT INTERFACE SPECIFICATION & OPERATIONAL RUNBOOK
**Project**: Paper // Local Workspace Dashboard  
**Runtime**: Local Browser (ES Modules, LocalStorage) + Zero-Dependency Node.js Server (`server.js`)  
**Target Agents**: GrokBot, Muse, Flok, OpenClaw, Hermes, and any autonomous coding/Web3 agent.

---

## 1. System Mission & Core Constraints

1. **Aesthetic Integrity**: Maintain the strict **papertrade.xyz** flat retro craft paper outline design. No loud drop shadows, keep monospace tokens, `[ var(--pt-*) ]` color variables, and sharp retro borders.
2. **Local-First & Offline**: All persistent user data lives in `localStorage` under keys `paper_research_table`, `paper_projects`, `paper_notes`, `paper_theme`, and `paper_ascii_bg`. Never inject cloud sync dependencies into the core without user consent.
3. **Zero Spaghetti / Modularity**: All new capabilities MUST be added as:
   - An **ActionSpec** in `src/core/registry.js`
   - An **Agent module** extending `src/agents/agent-interface.js`
   - An **Event** over `src/core/bus.js`

---

## 2. Quickstart for Autonomous Agents

### Start Local Server
```bash
node server.js
```
The application will serve at `http://localhost:8080`.

### Health Check (CLI / Headless Agent)
```bash
node -e "const http = require('http'); http.get('http://localhost:8080', (res) => { console.log('STATUS:', res.statusCode); process.exit(res.statusCode === 200 ? 0 : 1); });"
```

---

## 3. Machine-Readable API & Interfaces

### Global Browser Handle
When running headless browser tests (e.g., Puppeteer, Playwright, Chrome DevTools Protocol), the dashboard exposes a global controller on `window.PaperWorkspace`:

```javascript
// 1. Inspect State
window.PaperWorkspace.store.get('research');
window.PaperWorkspace.store.get('projects');
window.PaperWorkspace.store.get('note');

// 2. Dispatch an Event
window.PaperWorkspace.bus.emit('research:row_added', { row: { id: 'row_agent', source: 'Flok', project: 'Arbitrage Bot' } });

// 3. Execute an Agent Action
await window.PaperWorkspace.registry.executeAction('web3.mint', { contract: '0x...', amount: 1 });
await window.PaperWorkspace.registry.executeAction('audit.scan', { targetUrl: 'https://github.com/...' });
```

---

## 4. How External Agents Can Extend This Workspace

### Scenario A: Web3 & Smart Contract Agents (Mint / Trade / LP)
1. Add new actions in [src/agents/web3-journaler.js](file:///c:/Users/nayuta002/Desktop/test-antigravity/src/agents/web3-journaler.js):
   - Example actions: `web3.swap`, `web3.stake_lp`, `web3.claim_rewards`.
2. Connect to an RPC provider or browser wallet using [src/adapters/web3.js](file:///c:/Users/nayuta002/Desktop/test-antigravity/src/adapters/web3.js).
3. Append strategy notes or transaction hashes directly into project details using:
   ```javascript
   this.registry.executeAction('journal.record', {
     projectId: 'proj_1',
     noteContent: 'Executed swap 1.5 ETH -> 4,800 USDC. Tx: 0x...'
   });
   ```

### Scenario B: Security Auditor Agents (Hermes / Flok / Muse)
1. Register audit checks in [src/agents/security-auditor.js](file:///c:/Users/nayuta002/Desktop/test-antigravity/src/agents/security-auditor.js).
2. Read project source links from `store.get('projects')`.
3. Dispatch audit findings into the project detail modal or scratchpad.

### Scenario C: UI Card Extensions
To add a new Card or Modal tab:
1. Place HTML snippet into [index.html](file:///c:/Users/nayuta002/Desktop/test-antigravity/index.html).
2. Create `src/modules/<new-feature>.js`.
3. Import and initialize it inside [src/app.js](file:///c:/Users/nayuta002/Desktop/test-antigravity/src/app.js).

---

## 5. File Manifest for Agents

| Path | Purpose |
| :--- | :--- |
| `index.html` | Retro shell, 3-card stack DOM layout, and modal dialogues |
| `styles.css` | Design tokens (`--pt-page`, `--pt-panel`, etc.) and CSS classes |
| `server.js` | Zero-dependency static file server on port 8080 |
| `src/app.js` | Entrypoint: initializes modules, theme, and agent instances |
| `src/core/bus.js` | Pub/Sub EventBus (`on`, `off`, `emit`) |
| `src/core/store.js` | Reactive store synchronized with browser `localStorage` |
| `src/core/registry.js` | Action and agent registry (`registerAction`, `executeAction`) |
| `src/core/utils.js` | Modal controls, toast notifications, HTML escaping |
| `src/modules/` | Visual cards: `background.js`, `research.js`, `project.js`, `buffer.js`, `telemetry.js` |
| `src/adapters/` | Integration adapters: `web3.js` |
| `src/agents/` | Pluggable agent modules: `agent-interface.js`, `web3-journaler.js`, `security-auditor.js` |
