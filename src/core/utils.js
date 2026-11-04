/**
 * Core Utilities: Toast, DOM Escaping, Download Helper
 */
import { bus } from './bus.js';

let toastTimer = null;

export function showToast(message, type = 'normal') {
  const toast = document.getElementById('retroToast');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');
  if (!toast || !msgEl || !iconEl) return;

  clearTimeout(toastTimer);
  msgEl.textContent = message;

  if (type === 'error') {
    iconEl.textContent = '✕';
    iconEl.className = 'font-bold text-[var(--pt-negative)]';
  } else {
    iconEl.textContent = '✓';
    iconEl.className = 'font-bold text-[var(--pt-positive)]';
  }

  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2400);
}

// Connect toast to EventBus
bus.on('toast', ({ message, type }) => showToast(message, type));

export function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}
