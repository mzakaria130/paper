# AGENT OPERATIONAL DIRECTIVE // PAPER WORKSPACE
# Recognized by: GrokBot, Muse, Flok, OpenClaw, Hermes, Antigravity

[PROJECT_PROFILE]
Name: Paper // Local Workspace Dashboard
Type: Local-First Flat Retro Workspace + Autonomous Agent Extension Platform
Design Heritage: exchange.papertrade.xyz (Warm paper / night, monospace tokens, sharp borders, zero drop shadows)
Port: 8080 (via `node server.js`)

[AUTONOMOUS_OPERATING_RULES]
1. PRESERVE THE RETRO STYLE:
   - Use CSS classes from `styles.css` (`retro-card`, `retro-btn`, `retro-badge`, `retro-input`, `retro-table`).
   - Use CSS variables (`var(--pt-ink)`, `var(--pt-panel)`, `var(--pt-border)`).
   - Do NOT introduce modern bubbly CSS frameworks or arbitrary border radii.

2. ZERO CLOUD DATA EXFILTRATION:
   - User notes, research rows, and project specs are strictly client-side (`localStorage`).
   - Any external API or RPC calls must be explicit and opt-in.

3. ARCHITECTURAL PROTOCOL:
   - State mutations -> `src/core/store.js`
   - Inter-module communication -> `src/core/bus.js`
   - New tool/action execution -> `src/core/registry.js`
   - External library wrappers -> `src/adapters/`
   - Autonomous bot logic -> `src/agents/`

[DEV_COMMANDS]
Serve: node server.js
Verify: node -e "const http=require('http');http.get('http://localhost:8080',(r)=>{console.log(r.statusCode);process.exit(0);});"

[AGENT_BRIDGE]  (added: local API + CLI/MCP, zero-dep)
Canonical state file: paper-data.json (gitignored). Browser store hydrates
from GET /api/state on load and POSTs back on change (debounced), so agent
fills made while the browser is closed appear on next reload.
Bridge (no browser automation needed):
  node tools/paper-bridge.mjs status
  node tools/paper-bridge.mjs add-research --project "X" --link "https://..."
  node tools/paper-bridge.mjs add-project --name "X" --status ACTIVE --detail-file ./d.txt
  node tools/paper-bridge.mjs add-journal --pair "HYPE / USD" --action "LONG 20x"
  node tools/paper-bridge.mjs mcp   (stdio MCP: paper_status, paper_get_state,
                                    paper_add_research, paper_add_project,
                                    paper_add_journal, paper_set_notes)
All mutations dedupe (research: project+link, project: name,
journal: date+pair+action) and are read-modify-write via /api/state.
