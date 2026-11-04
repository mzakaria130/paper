/**
 * Project Card Module (Enrolled Projects Table & Popup Detail Modal)
 */
import { bus } from '../core/bus.js';
import { store } from '../core/store.js';
import { escapeHTML, openModal, showToast } from '../core/utils.js';

export function initProjectTable() {
  renderProjectTable();

  // Clear all projects button
  const clearBtn = document.getElementById('clearProjectsBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all enrolled projects from this table?')) {
        store.clearProjects();
        renderProjectTable();
        showToast('Project table cleared');
        bus.emit('project:cleared');
      }
    });
  }

  // Modal detail textarea auto-save
  const modalDetailText = document.getElementById('modalProjectDetailText');
  const modalSaveStatus = document.getElementById('modalDetailSaveStatus');
  const modalStats = document.getElementById('modalDetailStats');
  let saveTimeout = null;

  if (modalDetailText) {
    modalDetailText.addEventListener('input', () => {
      const activeId = store.get('activeProjectId');
      if (!activeId) return;
      const projects = store.get('projects') || [];
      const currentProj = projects.find(p => p.id === activeId);
      if (!currentProj) return;

      if (modalSaveStatus) {
        modalSaveStatus.textContent = '● TYPING...';
        modalSaveStatus.className = 'retro-badge retro-badge-accent';
      }

      const val = modalDetailText.value;
      const chars = val.length;
      const words = val.trim() ? val.trim().split(/\s+/).length : 0;
      if (modalStats) modalStats.textContent = `${words} WORDS • ${chars} CHARS`;

      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        currentProj.detail = val;
        store.set('projects', projects);
        if (modalSaveStatus) {
          modalSaveStatus.textContent = '● SAVED';
          modalSaveStatus.className = 'retro-badge retro-badge-positive';
        }
        bus.emit('project:detail_saved', { id: activeId, detail: val });
      }, 300);
    });
  }

  bus.on('store:changed:projects', () => renderProjectTable());
  bus.on('research:promoted', () => renderProjectTable());
}

export function openProjectDetailModal(projId) {
  const projects = store.get('projects') || [];
  const proj = projects.find(p => p.id === projId);
  if (!proj) return;

  store.set('activeProjectId', projId, false);

  const modalTitle = document.getElementById('modalProjectTitle');
  const modalMeta = document.getElementById('modalProjectMeta');
  const modalStats = document.getElementById('modalDetailStats');
  const modalSaveStatus = document.getElementById('modalDetailSaveStatus');
  const modalDetailText = document.getElementById('modalProjectDetailText');

  if (modalTitle) modalTitle.textContent = proj.name.toUpperCase();
  if (modalMeta) modalMeta.textContent = `SOURCE: ${proj.source || '-'} • LINK: ${proj.link || '-'}`;

  const detail = proj.detail || '';
  const chars = detail.length;
  const words = detail.trim() ? detail.trim().split(/\s+/).length : 0;
  if (modalStats) modalStats.textContent = `${words} WORDS • ${chars} CHARS`;
  if (modalSaveStatus) {
    modalSaveStatus.textContent = '● SAVED';
    modalSaveStatus.className = 'retro-badge retro-badge-positive';
  }
  if (modalDetailText) {
    modalDetailText.value = detail;
    setTimeout(() => modalDetailText.focus(), 80);
  }

  openModal('projectDetailModal');
  bus.emit('project:modal_opened', { id: projId });
}

export function renderProjectTable() {
  const tbody = document.getElementById('projectTableBody');
  const countBadge = document.getElementById('projectCountBadge');
  const footerText = document.getElementById('projectFooterText');
  const hoverPopover = document.getElementById('projectHoverPopover');
  const hoverTitle = document.getElementById('hoverPopoverTitle');
  const hoverContent = document.getElementById('hoverPopoverContent');

  if (!tbody) return;

  const list = store.get('projects') || [];
  if (countBadge) countBadge.textContent = `${list.length} PROJECTS`;
  if (footerText) footerText.textContent = `${list.length} PROJECTS ENROLLED`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-10 font-mono text-xs text-[var(--pt-ink-muted)]">
          No projects enrolled. Click [OK] on any item in Research above to throw it into this table.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((proj, idx) => {
    const rowNum = String(idx + 1).padStart(2, '0');
    const isUrl = /^https?:\/\//i.test(proj.link) || (proj.link && proj.link.includes('.'));
    const linkHref = /^https?:\/\//i.test(proj.link) ? proj.link : `https://${proj.link}`;

    let statusBadgeClass = 'retro-badge-accent';
    if (proj.status === 'DONE') statusBadgeClass = 'retro-badge-positive';
    if (proj.status === 'IN PROGRESS') statusBadgeClass = 'retro-badge-cyan';

    return `
      <tr class="cursor-pointer select-none" data-proj-id="${proj.id}">
        <td class="text-center font-mono text-[10px] text-[var(--pt-ink-muted)]">
          ${rowNum}
        </td>
        <td class="font-bold text-xs truncate max-w-[200px]">
          ${escapeHTML(proj.name)}
        </td>
        <td class="text-xs text-[var(--pt-ink-muted)] truncate max-w-[150px]">
          ${escapeHTML(proj.source || '-')}
        </td>
        <td>
          <select class="retro-badge ${statusBadgeClass} text-[9px] py-0 px-1 border cursor-pointer proj-status-select" data-proj-id="${proj.id}">
            <option value="ACTIVE" ${proj.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
            <option value="IN PROGRESS" ${proj.status === 'IN PROGRESS' ? 'selected' : ''}>IN PROGRESS</option>
            <option value="DONE" ${proj.status === 'DONE' ? 'selected' : ''}>DONE</option>
          </select>
        </td>
        <td>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-[var(--pt-ink-muted)] truncate max-w-[140px]">${escapeHTML(proj.link || '-')}</span>
            ${isUrl ? `
              <a href="${escapeHTML(linkHref)}" target="_blank" rel="noopener noreferrer" class="retro-badge text-[9px] py-0 px-1 text-[var(--pt-cyan)] hover:text-[var(--pt-ink)] flex-shrink-0" title="Open link">
                ↗
              </a>
            ` : ''}
          </div>
        </td>
        <td class="text-center">
          <button class="retro-btn retro-btn-danger text-[9px] py-0.5 px-1.5 proj-del-btn" data-proj-id="${proj.id}" title="Delete project">
            ✕
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Row interactions
  tbody.querySelectorAll('tr').forEach(tr => {
    const projId = tr.dataset.projId;
    const proj = list.find(p => p.id === projId);
    if (!proj) return;

    tr.addEventListener('click', (e) => {
      if (e.target.closest('.proj-del-btn') || e.target.closest('.proj-status-select') || e.target.closest('a')) {
        return;
      }
      openProjectDetailModal(projId);
    });

    tr.addEventListener('mouseenter', (e) => {
      if (!hoverPopover || !hoverTitle || !hoverContent) return;
      hoverTitle.textContent = proj.name;
      hoverContent.textContent = proj.detail || '(No detail text provided yet. Click row to add.)';
      hoverPopover.classList.remove('hidden');
      positionPopover(e);
    });

    tr.addEventListener('mousemove', (e) => {
      positionPopover(e);
    });

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

  // Status Select listeners
  tbody.querySelectorAll('.proj-status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      e.stopPropagation();
      const id = sel.dataset.projId;
      const item = list.find(p => p.id === id);
      if (item) {
        item.status = sel.value;
        store.set('projects', list);
        renderProjectTable();
        showToast(`Status updated: ${item.status}`);
        bus.emit('project:status_changed', { id, status: item.status });
      }
    });
  });

  // Delete Project listeners
  tbody.querySelectorAll('.proj-del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.projId;
      if (confirm('Delete this project?')) {
        const updated = list.filter(p => p.id !== id);
        store.set('projects', updated);
        renderProjectTable();
        showToast('Project removed');
        bus.emit('project:deleted', { id });
      }
    });
  });
}
