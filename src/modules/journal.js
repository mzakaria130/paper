/**
 * Journal Card Module (Trade Degen & LP Journal)
 * Tracks degen perps, spot trades, and concentrated liquidity pool positions.
 */
import { bus } from '../core/bus.js';
import { store, DEFAULT_JOURNAL } from '../core/store.js';
import { escapeHTML, openModal, closeModal, showToast } from '../core/utils.js';

let activeJournalId = null;

export function initJournalTable() {
  renderJournalTable();

  // Add Log Entry button -> opens modal
  const addEntryBtn = document.getElementById('addJournalEntryBtn');
  if (addEntryBtn) {
    addEntryBtn.addEventListener('click', () => {
      openJournalEntryModal();
    });
  }

  // Journal Entry Form Submit
  const journalForm = document.getElementById('journalEntryForm');
  if (journalForm) {
    journalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveJournalFormEntry();
    });
  }

  // Clear all journal entries button
  const clearBtn = document.getElementById('clearJournalBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all trade & LP journal entries?')) {
        store.set('journal', []);
        renderJournalTable();
        showToast('Trade & LP journal cleared');
        bus.emit('journal:cleared');
      }
    });
  }

  // Reset to sample entries
  const resetBtn = document.getElementById('resetJournalBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset journal with default trade & LP templates?')) {
        store.set('journal', JSON.parse(JSON.stringify(DEFAULT_JOURNAL)));
        renderJournalTable();
        showToast('Journal reset to defaults');
        bus.emit('journal:reset');
      }
    });
  }

  bus.on('store:changed:journal', () => renderJournalTable());
}

export function openJournalEntryModal(entryId = null) {
  activeJournalId = entryId;
  const list = store.get('journal') || [];
  const existing = entryId ? list.find(item => item.id === entryId) : null;

  const modalTitle = document.getElementById('journalModalTitle');
  const typeSelect = document.getElementById('journalTypeInput');
  const pairInput = document.getElementById('journalPairInput');
  const actionInput = document.getElementById('journalActionInput');
  const sizeInput = document.getElementById('journalSizeInput');
  const rangeInput = document.getElementById('journalRangeInput');
  const pnlInput = document.getElementById('journalPnlInput');
  const statusSelect = document.getElementById('journalStatusInput');
  const notesInput = document.getElementById('journalNotesInput');
  const dateInput = document.getElementById('journalDateInput');

  if (modalTitle) {
    modalTitle.textContent = existing ? `EDIT LOG // ${existing.pair}` : 'NEW LOG // DEGEN TRADE & LP';
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dateInput) dateInput.value = existing ? existing.date : today;
  if (typeSelect) typeSelect.value = existing ? existing.type : 'LP';
  if (pairInput) pairInput.value = existing ? existing.pair : '';
  if (actionInput) actionInput.value = existing ? existing.action : '';
  if (sizeInput) sizeInput.value = existing ? existing.size : '';
  if (rangeInput) rangeInput.value = existing ? existing.range : '';
  if (pnlInput) pnlInput.value = existing ? existing.pnl : '';
  if (statusSelect) statusSelect.value = existing ? existing.status : 'IN RANGE';
  if (notesInput) notesInput.value = existing ? existing.notes : '';

  openModal('journalEntryModal');
  setTimeout(() => {
    if (pairInput) pairInput.focus();
  }, 80);
}

function saveJournalFormEntry() {
  const list = store.get('journal') || [];
  const type = document.getElementById('journalTypeInput')?.value || 'LP';
  const pair = document.getElementById('journalPairInput')?.value.trim() || 'UNNAMED';
  const action = document.getElementById('journalActionInput')?.value.trim() || '-';
  const size = document.getElementById('journalSizeInput')?.value.trim() || '-';
  const range = document.getElementById('journalRangeInput')?.value.trim() || '-';
  const pnl = document.getElementById('journalPnlInput')?.value.trim() || '-';
  const status = document.getElementById('journalStatusInput')?.value || 'OPEN';
  const notes = document.getElementById('journalNotesInput')?.value.trim() || '';
  const date = document.getElementById('journalDateInput')?.value || new Date().toISOString().slice(0, 10);

  if (activeJournalId) {
    // Update existing
    const item = list.find(e => e.id === activeJournalId);
    if (item) {
      item.type = type;
      item.pair = pair;
      item.action = action;
      item.size = size;
      item.range = range;
      item.pnl = pnl;
      item.status = status;
      item.notes = notes;
      item.date = date;
    }
    showToast(`Updated entry for ${pair}`);
    bus.emit('journal:updated', { id: activeJournalId, pair });
  } else {
    // Create new
    const newEntry = {
      id: 'jn_' + Date.now(),
      date,
      type,
      pair,
      action,
      size,
      range,
      pnl,
      status,
      notes,
      createdAt: Date.now()
    };
    list.unshift(newEntry);
    showToast(`Logged ${type}: ${pair}`);
    bus.emit('journal:created', newEntry);
  }

  store.set('journal', list);
  renderJournalTable();
  closeModal('journalEntryModal');
}

export function renderJournalTable() {
  const tbody = document.getElementById('journalTableBody');
  const countBadge = document.getElementById('journalCountBadge');
  const footerText = document.getElementById('journalFooterText');
  const hoverPopover = document.getElementById('projectHoverPopover');
  const hoverTitle = document.getElementById('hoverPopoverTitle');
  const hoverContent = document.getElementById('hoverPopoverContent');

  if (!tbody) return;

  const list = store.get('journal') || [];
  if (countBadge) countBadge.textContent = `${list.length} POSITIONS`;
  if (footerText) footerText.textContent = `${list.length} LOGGED DEGEN / LP ENTRIES`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-10 font-mono text-xs text-[var(--pt-ink-muted)]">
          No trade or LP positions logged yet. Click + LOG ENTRY above to start journaling.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((entry, idx) => {
    const rowNum = String(idx + 1).padStart(2, '0');

    // Badges based on type
    const isLP = entry.type === 'LP';
    const typeBadge = isLP
      ? `<span class="retro-badge retro-badge-cyan text-[9px] py-0 px-1 font-bold">LP POOL</span>`
      : `<span class="retro-badge retro-badge-accent text-[9px] py-0 px-1 font-bold">TRADE</span>`;

    // PnL Styling
    let pnlClass = 'text-[var(--pt-ink-muted)]';
    if (entry.pnl && entry.pnl.includes('+')) pnlClass = 'text-[var(--pt-positive)] font-bold';
    else if (entry.pnl && entry.pnl.includes('-')) pnlClass = 'text-[var(--pt-negative)] font-bold';

    // Status Badge
    let statusClass = 'retro-badge';
    if (entry.status === 'IN RANGE' || entry.status === 'WIN') statusClass = 'retro-badge retro-badge-positive';
    else if (entry.status === 'OUT OF RANGE' || entry.status === 'LOSS') statusClass = 'retro-badge retro-badge-negative';
    else if (entry.status === 'OPEN') statusClass = 'retro-badge retro-badge-accent';

    return `
      <tr class="cursor-pointer select-none" data-journal-id="${entry.id}">
        <td class="text-center font-mono text-[10px] text-[var(--pt-ink-muted)]">
          ${rowNum}
        </td>
        <td class="font-mono text-[10px] text-[var(--pt-ink-muted)] whitespace-nowrap">
          ${escapeHTML(entry.date || '-')}
        </td>
        <td class="text-center">
          ${typeBadge}
        </td>
        <td class="font-bold text-xs truncate max-w-[170px]">
          ${escapeHTML(entry.pair)}
        </td>
        <td class="text-xs font-mono truncate max-w-[110px]">
          ${escapeHTML(entry.action || '-')}
        </td>
        <td class="text-xs font-mono truncate max-w-[110px]">
          ${escapeHTML(entry.size || '-')}
        </td>
        <td class="text-xs font-mono text-[var(--pt-ink-muted)] truncate max-w-[150px]">
          ${escapeHTML(entry.range || '-')}
        </td>
        <td class="text-xs font-mono ${pnlClass} truncate max-w-[120px]">
          ${escapeHTML(entry.pnl || '-')}
        </td>
        <td>
          <span class="${statusClass} text-[9px] py-0 px-1">${escapeHTML(entry.status || 'OPEN')}</span>
        </td>
        <td class="text-center">
          <div class="flex items-center justify-center gap-1">
            <button class="retro-btn text-[9px] py-0.5 px-1.5 journal-edit-btn" data-journal-id="${entry.id}" title="Edit log">
              ✎
            </button>
            <button class="retro-btn retro-btn-danger text-[9px] py-0.5 px-1.5 journal-del-btn" data-journal-id="${entry.id}" title="Delete log">
              ✕
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Row Click & Hover Listeners
  tbody.querySelectorAll('tr').forEach(tr => {
    const id = tr.dataset.journalId;
    const entry = list.find(e => e.id === id);
    if (!entry) return;

    tr.addEventListener('click', (e) => {
      if (e.target.closest('.journal-del-btn')) return;
      openJournalEntryModal(id);
    });

    // Hover popover for strategy notes
    tr.addEventListener('mouseenter', (e) => {
      if (!hoverPopover || !hoverTitle || !hoverContent) return;
      hoverTitle.textContent = `${entry.type}: ${entry.pair} (${entry.status})`;
      hoverContent.textContent = entry.notes ? `STRATEGY & EXECUTION NOTES:\n${entry.notes}` : `(No execution notes provided yet. Click row to edit.)`;
      hoverPopover.classList.remove('hidden');
      positionPopover(e);
    });

    tr.addEventListener('mousemove', (e) => positionPopover(e));

    tr.addEventListener('mouseleave', () => {
      if (hoverPopover) hoverPopover.classList.add('hidden');
    });

    function positionPopover(e) {
      if (!hoverPopover) return;
      const popW = 340;
      const popH = 160;
      let left = e.clientX + 16;
      let top = e.clientY + 12;
      if (left + popW > window.innerWidth) left = e.clientX - popW - 12;
      if (top + popH > window.innerHeight) top = window.innerHeight - popH - 12;
      hoverPopover.style.left = `${Math.max(10, left)}px`;
      hoverPopover.style.top = `${Math.max(10, top)}px`;
    }
  });

  // Edit Button Listeners
  tbody.querySelectorAll('.journal-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openJournalEntryModal(btn.dataset.journalId);
    });
  });

  // Delete Button Listeners
  tbody.querySelectorAll('.journal-del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.journalId;
      if (confirm('Delete this journal entry?')) {
        const updated = list.filter(e => e.id !== id);
        store.set('journal', updated);
        renderJournalTable();
        showToast('Journal entry deleted');
        bus.emit('journal:deleted', { id });
      }
    });
  });
}
