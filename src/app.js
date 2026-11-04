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

  // 2. Dashboard Cards (Research, Project, Journal, Buffer)
  initResearchTable();
  initProjectTable();
  initJournalTable();
  initScratchpad();

  // 3. Modals, Storage Telemetry, & Visual Architecture Map
  initTelemetry();
  initVisualArch();
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
  const web3Journaler = new Web3JournalerAgent();
  registry.registerAgent(web3Journaler);

  const securityAuditor = new SecurityAuditorAgent();
  registry.registerAgent(securityAuditor);
}
