/**
 * Backup / Restore & Local Storage Management
 */
import { bus } from '../core/bus.js';
import { store } from '../core/store.js';
import { downloadBlob, openModal, closeModal, showToast } from '../core/utils.js';

export function initTelemetry() {
  const quickExport = document.getElementById('quickExportBtn');
  const quickImport = document.getElementById('quickImportBtn');
  const dangerReset = document.getElementById('dangerResetBtn');

  if (quickExport) quickExport.addEventListener('click', exportBackup);
  if (quickImport) quickImport.addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });

  const modalExport = document.getElementById('modalExportBtn');
  const modalImport = document.getElementById('modalImportBtn');
  if (modalExport) modalExport.addEventListener('click', exportBackup);
  if (modalImport) modalImport.addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });

  const backupModalBtn = document.getElementById('backupModalBtn');
  if (backupModalBtn) {
    backupModalBtn.addEventListener('click', () => {
      openModal('backupModal');
    });
  }

  const fileInput = document.getElementById('importFileInput');
  if (fileInput) fileInput.addEventListener('change', handleFileImport);

  if (dangerReset) {
    dangerReset.addEventListener('click', () => {
      if (confirm('CRITICAL ACTION: Reset entire workspace and delete all stored local data?')) {
        localStorage.clear();
        location.reload();
      }
    });
  }
}

export function exportBackup() {
  const backupData = {
    version: 3,
    timestamp: new Date().toISOString(),
    theme: store.get('theme'),
    asciiEnabled: store.get('asciiEnabled'),
    research: store.get('research'),
    projects: store.get('projects'),
    journal: store.get('journal'),
    notes: store.get('note'),
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const now = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `paper-workspace-backup-${now}.json`);
  showToast('Backup JSON exported successfully');
  bus.emit('backup:exported', { timestamp: backupData.timestamp });
}

export function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const data = JSON.parse(event.target.result);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON format');
      }

      if (data.research && Array.isArray(data.research.columns) && Array.isArray(data.research.rows)) {
        store.set('research', data.research);
      }

      if (Array.isArray(data.projects)) {
        store.set('projects', data.projects);
      }

      if (Array.isArray(data.journal)) {
        store.set('journal', data.journal);
      }

      if (typeof data.notes === 'string') {
        store.set('note', data.notes);
        const scratchpad = document.getElementById('scratchpadText');
        if (scratchpad) scratchpad.value = data.notes;
      }

      if (typeof data.asciiEnabled === 'boolean') {
        store.set('asciiEnabled', data.asciiEnabled);
      }

      if (data.theme) {
        store.set('theme', data.theme);
        applyTheme(data.theme);
      }

      closeModal('backupModal');
      showToast('Backup restored successfully!', 'positive');
      bus.emit('backup:restored');
    } catch (err) {
      console.error('[Telemetry] Import error', err);
      showToast('Failed to import backup: Invalid JSON', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.getElementById('themeIcon');
  const mobileIcon = document.getElementById('mobileThemeIcon');
  if (theme === 'dark') {
    if (icon) icon.textContent = '☼';
    if (mobileIcon) mobileIcon.textContent = '☼';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0d1229');
  } else {
    if (icon) icon.textContent = '☾';
    if (mobileIcon) mobileIcon.textContent = '☾';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ede5d0');
  }
}
