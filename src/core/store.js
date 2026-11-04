/**
 * Reactive Local State Store
 * Manages state persistence, seed defaults, and publishes change events over the Event Bus.
 */
import { bus } from './bus.js';

export const KEYS = {
  THEME: 'paper_theme',
  ASCII_BG: 'paper_ascii_bg',
  RESEARCH: 'paper_research_table',
  PROJECTS: 'paper_projects',
  JOURNAL: 'paper_degen_journal',
  NOTES: 'paper_notes',
  AUDIT_REPORT: 'paper_audit_report',
};

const DEFAULT_JOURNAL = [
  {
    id: 'jn_1',
    date: '2026-11-03',
    type: 'LP',
    pair: 'BTC/USDC HyperEVM',
    action: 'ADD_LIQ',
    range: '$67,500 - $72,000',
    size: '$12,500',
    pnl: '+$420 (Fees)',
    status: 'IN RANGE',
    notes: 'Concentrated liquidity vault. Low impermanent loss risk during consolidation.'
  },
  {
    id: 'jn_2',
    date: '2026-11-02',
    type: 'TRADE',
    pair: 'HYPE / USD',
    action: 'LONG 20x',
    range: 'Entry: $42.50 | TP: $51.00',
    size: '$2,000',
    pnl: '+$1,680 (+84%)',
    status: 'CLOSED',
    notes: 'Breakout above range resistance with increasing spot volume. Took profit at $51.'
  }
];

const DEFAULT_RESEARCH = {
  columns: [
    { id: 'source', name: 'SOURCE' },
    { id: 'project', name: 'PROJECT' },
    { id: 'link', name: 'LINK' },
  ],
  rows: [
    {
      id: 'row_1',
      source: 'ArXiv / Whitepaper',
      project: 'Perpetual DEX Architecture',
      link: 'https://arxiv.org'
    },
    {
      id: 'row_2',
      source: 'GitHub / Hyperliquid',
      project: 'HyperEVM Smart Contracts',
      link: 'https://github.com'
    },
    {
      id: 'row_3',
      source: 'Papertrade Specs',
      project: 'Retro Flat UI Terminal',
      link: 'https://papertrade.xyz'
    }
  ]
};

const DEFAULT_PROJECTS = [
  {
    id: 'proj_1',
    name: 'Perpetual DEX Architecture',
    source: 'ArXiv / Whitepaper',
    link: 'https://arxiv.org',
    status: 'ACTIVE',
    detail: `// PERPETUAL DEX ARCHITECTURE SPECIFICATION
- Protocol: Synthetic peer-to-peer perpetuals built on HyperEVM
- Margin Model: Cross-margin isolated vaults with extreme leverage
- House Liquidity: Single pooled counterparty model with zero execution slippage
- Fee Model: Zero traditional trading fees and zero funding rates
- Oracle: Sub-second medianized reference price engine`,
    createdAt: Date.now() - 3600000
  },
  {
    id: 'proj_2',
    name: 'HyperEVM Smart Contracts',
    source: 'GitHub / Hyperliquid',
    link: 'https://github.com',
    status: 'IN PROGRESS',
    detail: `// HYPEREVM SMART CONTRACT IMPLEMENTATION
- Solidity v0.8.24 deployment scripts
- Foundry test coverage for liquidation parameters and loss rebate token
- Automated gas estimation and batch execution pipelines`,
    createdAt: Date.now() - 7200000
  }
];

const DEFAULT_NOTE = 
`// WELCOME TO YOUR LOCAL WORKSPACE
--------------------------------------------
- Card-based, flat retro operation
- Papertrade outline design system
- Runs 100% locally in browser (no cloud)
- Stored safely in localStorage
- Click [DATA] to export/import JSON backups
--------------------------------------------
Scratchpad auto-saves on every keystroke.`;

function loadJSON(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`[Store] Failed to parse key ${key}:`, e);
    return fallback;
  }
}

function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`[Store] Storage error on ${key}:`, e);
    bus.emit('toast', { message: 'Storage error!', type: 'error' });
  }
}

class Store {
  constructor() {
    this.state = {
      theme: localStorage.getItem(KEYS.THEME) || 'light',
      asciiEnabled: localStorage.getItem(KEYS.ASCII_BG) !== 'false',
      research: loadJSON(KEYS.RESEARCH, DEFAULT_RESEARCH),
      projects: loadJSON(KEYS.PROJECTS, DEFAULT_PROJECTS),
      activeProjectId: null,
      journal: loadJSON(KEYS.JOURNAL, DEFAULT_JOURNAL),
      note: localStorage.getItem(KEYS.NOTES) !== null ? localStorage.getItem(KEYS.NOTES) : DEFAULT_NOTE,
      auditReport: loadJSON(KEYS.AUDIT_REPORT, null),
    };
    this._hydrating = true;
    this._syncTimer = null;
    this.initFromServer();
  }

  // Agent bridge: adopt canonical server state (paper-data.json via /api/state)
  // if present; otherwise keep localStorage/defaults. Server file wins on
  // first load so CLI/MCP fills made while the browser was closed appear.
  async initFromServer() {
    try {
      const r = await fetch('/api/state');
      const data = await r.json();
      if (data && !data.initialized && data.research && Array.isArray(data.projects)) {
        this.set('research', data.research, true);
        this.set('projects', data.projects, true);
        this.set('journal', data.journal, true);
        this.set('note', data.notes, true);
        if (typeof data.theme === 'string') this.set('theme', data.theme, true);
        if (typeof data.asciiEnabled === 'boolean') this.set('asciiEnabled', data.asciiEnabled, true);
        bus.emit('store:hydrated_from_server', data);
      }
    } catch (e) { /* offline/static-only mode: stay on localStorage */ }
    this._hydrating = false;
  }

  // Persist canonical state back to the server file (debounced).
  syncToServer() {
    if (this._hydrating) return;
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => {
      const snapshot = {
        version: 3,
        theme: this.state.theme,
        asciiEnabled: this.state.asciiEnabled,
        research: this.state.research,
        projects: this.state.projects,
        journal: this.state.journal,
        notes: this.state.note,
        auditReport: this.state.auditReport || null,
      };
      fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) })
        .catch((e) => console.warn('[Store] server sync failed', e));
    }, 400);
  }

  get(key) {
    return this.state[key];
  }

  set(key, val, persist = true) {
    this.state[key] = val;
    if (persist) {
      if (key === 'theme') localStorage.setItem(KEYS.THEME, val);
      else if (key === 'asciiEnabled') localStorage.setItem(KEYS.ASCII_BG, String(val));
      else if (key === 'research') saveJSON(KEYS.RESEARCH, val);
      else if (key === 'projects') saveJSON(KEYS.PROJECTS, val);
      else if (key === 'journal') saveJSON(KEYS.JOURNAL, val);
      else if (key === 'note') localStorage.setItem(KEYS.NOTES, val);
      else if (key === 'auditReport') saveJSON(KEYS.AUDIT_REPORT, val);
    }
    bus.emit(`store:changed:${key}`, val);
    bus.emit('store:changed', { key, value: val });
    if (persist) this.syncToServer();
  }

  resetResearch() {
    this.set('research', JSON.parse(JSON.stringify(DEFAULT_RESEARCH)));
  }

  clearProjects() {
    this.set('projects', []);
    this.set('activeProjectId', null, false);
  }
}

export const store = new Store();
export { DEFAULT_RESEARCH, DEFAULT_PROJECTS, DEFAULT_JOURNAL, DEFAULT_NOTE };
