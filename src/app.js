import { initAgentTicker } from './modules/agent-ticker.js';
/**
 * PAPER // LOCAL WORKSPACE DASHBOARD
 * Modular Bootstrapper & Entry Point
 * Cloned outline style from https://exchange.papertrade.xyz
 */
import { bus } from './core/bus.js';
import { store } from './core/store.js';
import { registry } from './core/registry.js';
import { showToast, closeModal } from './core/utils.js';

import { initAsciiBackground } from './modules/background.js';
import { initResearchTable } from './modules/research.js';
import { initProjectTable } from './modules/project.js';
import { initJournalTable } from './modules/journal.js';
import { initScratchpad } from './modules/buffer.js';
import { initTelemetry, applyTheme } from './modules/telemetry.js';
import { initVisualArch } from './modules/visual-arch.js';
import { initSecurityCard } from './modules/security.js';

import { Web3JournalerAgent } from './agents/web3-journaler.js';
import { SecurityAuditorAgent } from './agents/security-auditor.js';

// Expose public API on window for debugging & external scripting
window.PaperWorkspace = {
  bus,
  store,
  registry,
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Core Visuals & System Theme
  initTheme();
  initAsciiBackground();
  initAgentTicker();

  // 2. Dashboard Cards (Research, Project, Journal, Buffer)
  initResearchTable();
  initProjectTable();
  initJournalTable();
  initScratchpad();

  // 3. Modals, Storage Telemetry, & Visual Architecture Map
  initTelemetry();
  initVisualArch();
  initSecurityCard();
  initMobileMenu();
  initModals();
  initKeyboardShortcuts();

  // 4. Register & Initialize Plug-in Agents
  initAgents();

  console.log('[Paper // Workspace] Modular platform initialized. Ready for agent integration.');
});

function initTheme() {
  applyTheme(store.get('theme'));

  const handleToggle = () => {
    const current = store.get('theme');
    const nextTheme = current === 'light' ? 'dark' : 'light';
    store.set('theme', nextTheme);
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme === 'light' ? 'Paper' : 'Night'} theme`);
  };

  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', handleToggle);
  }

  const mobileToggleBtn = document.getElementById('mobileThemeToggleBtn');
  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', handleToggle);
  }
}

function initMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const dropdown = document.getElementById('mobileMenuDropdown');
  const icon = document.getElementById('mobileMenuIcon');

  if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', () => {
      const isHidden = dropdown.classList.toggle('hidden');
      if (icon) icon.textContent = isHidden ? '☰' : '✕';
    });
  }

  // Wire mobile MAP and DATA buttons to trigger their respective actions
  const mobileMapBtn = document.getElementById('mobileMapBtn');
  if (mobileMapBtn) {
    mobileMapBtn.addEventListener('click', () => {
      dropdown?.classList.add('hidden');
      if (icon) icon.textContent = '☰';
      document.getElementById('mapModalBtn')?.click();
    });
  }

  const mobileBackupBtn = document.getElementById('mobileBackupBtn');
  if (mobileBackupBtn) {
    mobileBackupBtn.addEventListener('click', () => {
      dropdown?.classList.add('hidden');
      if (icon) icon.textContent = '☰';
      document.getElementById('backupModalBtn')?.click();
    });
  }
}

function initModals() {
  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      closeModal(modalId);
    });
  });

  document.querySelectorAll('.retro-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });
}

function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.retro-modal-overlay:not(.hidden)').forEach(modal => {
        modal.classList.add('hidden');
      });
    }
  });
}

function initAgents() {
  // LAZY by default: agents are registered as factories only. They load
  // (instantiate + wire actions/listeners) on first use via
  // registry.executeAction(...) or registry.runAgent(...).
  // ALWAYS-ON is opt-in only:
  //   localStorage.setItem('paper_agent_mode', 'always')  (then reload), or
  //   http://localhost:8080/?agents=always, or
  //   PaperWorkspace.agents.setMode('always') at runtime.
  const always = new URLSearchParams(location.search).get('agents') === 'always'
    || localStorage.getItem('paper_agent_mode') === 'always';

  const defs = [
    { id: 'agent.web3_journaler', create: () => new Web3JournalerAgent(), actions: ['web3.mint', 'web3.swap', 'web3.lp_snapshot', 'journal.record'], events: ['research:promoted'] },
    { id: 'agent.security_auditor', create: () => new SecurityAuditorAgent(), actions: ['audit.scan', 'audit.fix', 'audit.report', 'dev.generate_plan'], events: [] },
  ];

  for (const def of defs) {
    registry.registerLazyAgent(def);
    if (always) registry.ensureAgent(def.id);
  }
  window.PaperWorkspace.agents = {
    mode: always ? 'always' : 'lazy',
    list: () => registry.listLazyAgents(),
    ensure: (id) => registry.ensureAgent(id),
    run: (id, actionId, ctx) => registry.runAgent(id, actionId, ctx),
    setMode: (m) => { localStorage.setItem('paper_agent_mode', m); console.log(`[Paper] agent mode set to "${m}" — reload to apply`); },
  };
  console.log(`[Paper] Agents ready in ${always ? 'ALWAYS-ON' : 'LAZY (on-demand)'} mode: ${defs.map((d) => d.id).join(', ')}`);
}
