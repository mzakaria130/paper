/**
 * Buffer // Scratchpad Card Module
 */
import { bus } from '../core/bus.js';
import { store } from '../core/store.js';
import { downloadBlob, showToast } from '../core/utils.js';

export function initScratchpad() {
  const textarea = document.getElementById('scratchpadText');
  const status = document.getElementById('noteSaveStatus');
  const stats = document.getElementById('noteStats');

  if (!textarea) return;

  textarea.value = store.get('note');
  updateNoteStats();

  let saveTimeout = null;

  textarea.addEventListener('input', () => {
    if (status) {
      status.textContent = '● TYPING...';
      status.className = 'retro-badge retro-badge-accent';
    }
    updateNoteStats();

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      store.set('note', textarea.value);
      if (status) {
        status.textContent = '● SAVED';
        status.className = 'retro-badge retro-badge-positive';
      }
      bus.emit('buffer:saved', { length: textarea.value.length });
    }, 300);
  });

  function updateNoteStats() {
    if (!stats) return;
    const val = textarea.value;
    const chars = val.length;
    const words = val.trim() ? val.trim().split(/\s+/).length : 0;
    stats.textContent = `${words} WORDS • ${chars} CHARS`;
  }

  const copyBtn = document.getElementById('copyNoteBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(textarea.value).then(() => {
        showToast('Notes copied to clipboard!');
      }).catch(() => {
        showToast('Failed to copy', 'error');
      });
    });
  }

  const downloadBtn = document.getElementById('downloadNoteBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
      const now = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `workspace-notes-${now}.txt`);
      showToast('Notes downloaded as .txt');
    });
  }

  const clearBtn = document.getElementById('clearNoteBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear entire scratchpad buffer?')) {
        textarea.value = '';
        store.set('note', '');
        updateNoteStats();
        if (status) status.textContent = '● CLEARED';
        showToast('Notes buffer cleared');
        bus.emit('buffer:cleared');
      }
    });
  }
}
