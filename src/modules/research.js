/**
 * Research Card Module (Excel-Like Dynamic Table)
 */
import { bus } from '../core/bus.js';
import { store } from '../core/store.js';
import { escapeHTML, openModal, closeModal, showToast } from '../core/utils.js';

export function initResearchTable() {
  renderResearchTable();

  // Add Row button
  const addRowBtn = document.getElementById('addRowBtn');
  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      const research = store.get('research');
      const newRow = { id: 'row_' + Date.now() };
      (research.columns || []).forEach(col => {
        newRow[col.id] = '';
      });
      research.rows.push(newRow);
      store.set('research', research);
      renderResearchTable();
      showToast('New row added');

      bus.emit('research:row_added', { row: newRow });

      setTimeout(() => {
        const lastRowInputs = document.querySelectorAll('#researchTableBody tr:last-child input');
        if (lastRowInputs.length > 0) lastRowInputs[0].focus();
      }, 50);
    });
  }

  // Add Column button
  const addColBtn = document.getElementById('addColBtn');
  if (addColBtn) {
    addColBtn.addEventListener('click', () => {
      openModal('addColModal');
      const input = document.getElementById('colNameInput');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  }

  // Add Column form submit
  const addColForm = document.getElementById('addColForm');
  if (addColForm) {
    addColForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('colNameInput');
      const colName = input.value.trim().toUpperCase();
      if (!colName) return;

      const research = store.get('research');
      const colId = 'col_' + Date.now();
      research.columns.push({
        id: colId,
        name: colName,
      });

      research.rows.forEach(r => {
        if (r[colId] === undefined) r[colId] = '';
      });

      store.set('research', research);
      renderResearchTable();
      closeModal('addColModal');
      input.value = '';
      showToast(`Column "${colName}" added`);
      bus.emit('research:column_added', { id: colId, name: colName });
    });
  }

  // Reset Table button
  const resetBtn = document.getElementById('resetTableBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset research table to default 3 columns (SOURCE, PROJECT, LINK)?')) {
        store.resetResearch();
        renderResearchTable();
        showToast('Research table reset');
        bus.emit('research:reset');
      }
    });
  }

  // Listen to external/backup restores, but ignore self-triggered input updates
  bus.on('backup:restored', () => renderResearchTable());
}

export function renderResearchTable() {
  const thead = document.getElementById('researchTableHead');
  const tbody = document.getElementById('researchTableBody');
  const countBadge = document.getElementById('researchCountBadge');
  const statsText = document.getElementById('researchStatsText');
  if (!thead || !tbody) return;

  const research = store.get('research') || { columns: [], rows: [] };
  const cols = research.columns || [];
  const rows = research.rows || [];

  if (countBadge) countBadge.textContent = `${rows.length} ROWS`;
  if (statsText) statsText.textContent = `${rows.length} ROWS • ${cols.length} COLUMNS`;

  // Render Table Header
  let headHtml = `<th class="w-10 text-center text-[var(--pt-ink-muted)]">#</th>`;
  cols.forEach(col => {
    headHtml += `
      <th>
        <div class="col-header-wrap">
          <span>${escapeHTML(col.name)}</span>
          ${cols.length > 1 ? `<button class="col-del-btn" data-col-id="${col.id}" title="Remove column ${escapeHTML(col.name)}">✕</button>` : ''}
        </div>
      </th>
    `;
  });
  headHtml += `<th class="w-24 text-center text-[var(--pt-ink-muted)]">ACTION</th>`;
  thead.innerHTML = headHtml;

  // Attach column delete listeners
  thead.querySelectorAll('.col-del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const colId = btn.dataset.colId;
      const targetCol = cols.find(c => c.id === colId);
      const colName = targetCol ? targetCol.name : 'column';

      if (confirm(`Remove column "${colName}" and all its data?`)) {
        research.columns = research.columns.filter(c => c.id !== colId);
        research.rows.forEach(r => {
          delete r[colId];
        });
        store.set('research', research);
        renderResearchTable();
        showToast(`Column "${colName}" removed`);
        bus.emit('research:column_removed', { id: colId });
      }
    });
  });

  // Render Table Body
  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${cols.length + 2}" class="text-center py-12 font-mono text-xs text-[var(--pt-ink-muted)]">
          No research entries. Click + ADD ROW above to start adding data.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((row, idx) => {
    const rowNum = String(idx + 1).padStart(2, '0');
    let cellsHtml = `
      <td class="text-center font-mono text-[10px] text-[var(--pt-ink-muted)] select-none">
        ${rowNum}
      </td>
    `;

    cols.forEach(col => {
      const val = row[col.id] || '';
      const isUrl = /^https?:\/\//i.test(val) || (col.id === 'link' && val.includes('.'));
      const linkHref = /^https?:\/\//i.test(val) ? val : `https://${val}`;

      cellsHtml += `
        <td>
          <div class="flex items-center gap-1">
            <input 
              type="text" 
              class="table-cell-input flex-1 min-w-[120px]" 
              data-row-id="${row.id}" 
              data-col-id="${col.id}" 
              value="${escapeHTML(val)}" 
              placeholder="-"
              spellcheck="false"
            />
            ${isUrl ? `
              <a href="${escapeHTML(linkHref)}" target="_blank" rel="noopener noreferrer" class="retro-badge text-[9px] py-0 px-1 text-[var(--pt-cyan)] hover:text-[var(--pt-ink)] flex-shrink-0" title="Open link">
                ↗
              </a>
            ` : ''}
          </div>
        </td>
      `;
    });

    cellsHtml += `
      <td class="text-center">
        <div class="flex items-center justify-center gap-1">
          <button class="retro-btn retro-btn-primary text-[9px] py-0.5 px-2 promote-proj-btn" data-row-id="${row.id}" title="Throw / Add to Project Table">
            OK
          </button>
          <button class="retro-btn retro-btn-danger text-[9px] py-0.5 px-1.5 row-del-btn" data-row-id="${row.id}" title="Delete row">
            ✕
          </button>
        </div>
      </td>
    `;

    return `<tr data-row-id="${row.id}">${cellsHtml}</tr>`;
  }).join('');

  // Attach promote "OK" listeners (Throws from Research to Project)
  tbody.querySelectorAll('.promote-proj-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowId = btn.dataset.rowId;
      const row = rows.find(r => r.id === rowId);
      if (!row) return;

      const projName = (row.project || row.source || 'New Research Project').trim();
      const newProject = {
        id: 'proj_' + Date.now(),
        name: projName,
        source: (row.source || 'Research Table').trim(),
        link: (row.link || '').trim(),
        status: 'ACTIVE',
        detail: `// PROJECT SPECIFICATION: ${projName.toUpperCase()}
Source: ${row.source || '-'}
Reference Link: ${row.link || '-'}

[Document implementation roadmap, technical specifications, and milestones here...]`,
        createdAt: Date.now()
      };

      const projects = store.get('projects') || [];
      projects.unshift(newProject);
      store.set('projects', projects);
      store.set('activeProjectId', newProject.id, false);

      showToast(`✓ Threw "${projName}" into Project Table!`);
      bus.emit('research:promoted', { project: newProject, sourceRow: row });
    });
  });

  // Attach row delete listeners
  tbody.querySelectorAll('.row-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rowId = btn.dataset.rowId;
      research.rows = research.rows.filter(r => r.id !== rowId);
      store.set('research', research);
      renderResearchTable();
      showToast('Row deleted');
      bus.emit('research:row_deleted', { id: rowId });
    });
  });

  // Attach cell input listeners for inline auto-save
  let autoSaveTimeout = null;
  tbody.querySelectorAll('.table-cell-input').forEach(input => {
    input.addEventListener('input', () => {
      const rowId = input.dataset.rowId;
      const colId = input.dataset.colId;
      const targetRow = research.rows.find(r => r.id === rowId);
      if (targetRow) {
        targetRow[colId] = input.value;
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
          store.set('research', research);
        }, 200);
      }
    });

    input.addEventListener('blur', () => {
      clearTimeout(autoSaveTimeout);
      store.set('research', research);
      // Re-render on blur so dynamic link badges (↗) update without stealing focus while typing
      renderResearchTable();
    });
  });
}
