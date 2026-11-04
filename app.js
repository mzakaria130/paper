/**
 * PAPER // LOCAL WORKSPACE DASHBOARD
 * Pure Vanilla JavaScript & LocalStorage Engine
 * Cloned outline style from https://exchange.papertrade.xyz
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // STORAGE KEYS
  // -------------------------------------------------------------------------
  const KEYS = {
    THEME: 'paper_theme',
    ASCII_BG: 'paper_ascii_bg',
    RESEARCH: 'paper_research_table',
    PROJECTS: 'paper_projects',
    NOTES: 'paper_notes',
  };

  // -------------------------------------------------------------------------
  // DEFAULT SEED DATA
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------------------
  let state = {
    theme: localStorage.getItem(KEYS.THEME) || 'light',
    asciiEnabled: localStorage.getItem(KEYS.ASCII_BG) !== 'false',
    research: loadJSON(KEYS.RESEARCH, DEFAULT_RESEARCH),
    projects: loadJSON(KEYS.PROJECTS, DEFAULT_PROJECTS),
    activeProjectId: null,
    note: localStorage.getItem(KEYS.NOTES) !== null ? localStorage.getItem(KEYS.NOTES) : DEFAULT_NOTE,
  };

  function loadJSON(key, fallback) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn('Failed to parse localStorage key:', key, e);
      return fallback;
    }
  }

  function saveJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('Storage full or error saving key:', key, e);
      showToast('Storage error!', 'error');
    }
  }

  // -------------------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAsciiBackground();
    initResearchTable();
    initProjectTable();
    initScratchpad();
    initTelemetry();
    initModals();
    initKeyboardShortcuts();
    updateTelemetryStats();
  });

  // -------------------------------------------------------------------------
  // 1. THEME TOGGLE (PAPER / NIGHT) - SINGLE SQUARE BUTTON
  // -------------------------------------------------------------------------
  function initTheme() {
    applyTheme(state.theme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        state.theme = newTheme;
        localStorage.setItem(KEYS.THEME, newTheme);
        applyTheme(newTheme);
        showToast(`Switched to ${newTheme === 'light' ? 'Paper' : 'Night'} theme`);
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const icon = document.getElementById('themeIcon');
    if (icon) {
      if (theme === 'dark') {
        icon.textContent = '☼'; // Show Sun in dark mode so user can click to switch to paper
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0d1229');
      } else {
        icon.textContent = '☾'; // Show Moon in paper mode so user can click to switch to night
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ede5d0');
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. SEAMLESS ENDLESS ASCII BITCOIN RUNNING TEXT PATTERN (RIGHT TO LEFT)
  // -------------------------------------------------------------------------
  function initAsciiBackground() {
    const canvas = document.getElementById('asciiCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId = null;

    // Pattern definitions centered on Bitcoin
    // 5-line grand ASCII Bitcoin banner + coin silhouette (kept aligned)
    const BANNER_LINES = [
      "   .---------.     ██████╗  ██╗ ████████╗  ██████╗   ██████╗  ██╗ ███╗   ██╗    [ ₿ BITCOIN // LEDGER ]     ",
      "  /  ₿     ₿  \\    ██╔══██╗ ██║ ╚══██╔══╝ ██╔════╝  ██╔═══██╗ ██║ ████╗  ██║    [ BLOCK #867,420 ]          ",
      " |  [BITCOIN]  |   ██████╔╝ ██║    ██║    ██║       ██║   ██║ ██║ ██╔██╗ ██║    [ 21,000,000 HARD CAP ]     ",
      "  \\  ₿     ₿  /    ██╔══██╗ ██║    ██║    ██║       ██║   ██║ ██║ ██║╚██╗██║    [ SHA-256 PROOF-OF-WORK ]   ",
      "   '---------'     ██████╔╝ ██║    ██║    ╚██████╗  ╚██████╔╝ ██║ ██║ ╚████║    [ DECENTRALIZED PROTOCOL ]  ",
    ];

    // Other atmospheric Bitcoin & telemetry running tape lines
    const TAPE_HEADER = "════ ₿ BITCOIN CONTINUOUS NETWORK ════ [PEER-TO-PEER CASH] ════ BLOCK #867,420 ════ SHA-256 ════ DIFFICULTY: 84.23 T ════ MEMPOOL: SYNCED ════ ";
    const TAPE_TICKER = " ₿ BTC/USD: $68,420.50 ▲ +3.42% ── SAT/USD: $0.000684 ── 24H_HIGH: $69,150.00 ── 24H_LOW: $66,800.00 ── VOL: 42,918 BTC ── PAPERTRADE DEX ── ";
    const TAPE_GENESIS = ' "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks" ── SATOSHI NAKAMOTO ── GENESIS HASH: 000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f ── ';
    const TAPE_MEDALLIONS = "[ ₿ ] ────── [ BTC ] ────── [ ₿ ] ────── [ 21M ] ────── [ ₿ ] ────── [ SAT ] ────── [ ₿ ] ────── [ HODL ] ────── [ ₿ ] ────── [ P2P ] ────── ";
    const TAPE_HASH = " 000000000000000000024be43aced4289832117a22839d09c687e14c46f235b6 ── NONCE: 2083236893 ── MERKLE: 4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b ── ";

    // Speed configurations for each lane (pixels per frame, right-to-left)
    const SPEEDS = {
      header: 0.85,
      banner: 1.15, // lines 0-4 of banner move together
      ticker: 1.60,
      genesis: 0.70,
      medallions: 1.05,
      hash: 1.30,
    };

    // Horizontal offset state for each unique speed group
    const offsets = {
      header: 0,
      banner: 0,
      ticker: 0,
      genesis: 0,
      medallions: 0,
      hash: 0,
    };

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Cache line pixel widths for seamless wrapping
    let cachedWidths = null;
    function measureWidths() {
      ctx.font = '12px "JetBrains Mono", monospace';
      cachedWidths = {
        header: ctx.measureText(TAPE_HEADER).width,
        banner: ctx.measureText(BANNER_LINES[0]).width,
        ticker: ctx.measureText(TAPE_TICKER).width,
        genesis: ctx.measureText(TAPE_GENESIS).width,
        medallions: ctx.measureText(TAPE_MEDALLIONS).width,
        hash: ctx.measureText(TAPE_HASH).width,
      };
    }

    // Helper: draw seamless running line from right to left
    function drawSeamlessLine(text, textWidth, offset, y) {
      if (!textWidth) return;
      const normOffset = offset % textWidth;
      let startX = -normOffset;
      while (startX < canvas.width) {
        ctx.fillText(text, startX, y);
        startX += textWidth;
      }
    }

    // -----------------------------------------------------------------------
    // Core Render Pass
    // -----------------------------------------------------------------------
    function renderFrame() {
      const width = canvas.width;
      const height = canvas.height;
      if (!width || !height) return;

      if (!cachedWidths) measureWidths();

      // Advance offsets (moving from right to left)
      offsets.header = (offsets.header + SPEEDS.header) % cachedWidths.header;
      offsets.banner = (offsets.banner + SPEEDS.banner) % cachedWidths.banner;
      offsets.ticker = (offsets.ticker + SPEEDS.ticker) % cachedWidths.ticker;
      offsets.genesis = (offsets.genesis + SPEEDS.genesis) % cachedWidths.genesis;
      offsets.medallions = (offsets.medallions + SPEEDS.medallions) % cachedWidths.medallions;
      offsets.hash = (offsets.hash + SPEEDS.hash) % cachedWidths.hash;

      ctx.clearRect(0, 0, width, height);
      ctx.font = '12px "JetBrains Mono", monospace';

      // Pick theme ink color
      const isDark = document.documentElement.dataset.theme === 'dark';
      ctx.fillStyle = isDark ? '#c7c4d8' : '#7a7060';

      const lineHeight = 19;
      const unitLineCount = 10;
      const unitHeight = unitLineCount * lineHeight;
      const repeats = Math.ceil(height / unitHeight) + 1;

      for (let r = 0; r < repeats; r++) {
        const baseY = r * unitHeight;

        // Line 0: Network delimiter
        drawSeamlessLine(TAPE_HEADER, cachedWidths.header, offsets.header, baseY + lineHeight * 1);

        // Lines 1-5: Grand ASCII Bitcoin Emblem & Wordmark
        for (let b = 0; b < BANNER_LINES.length; b++) {
          drawSeamlessLine(BANNER_LINES[b], cachedWidths.banner, offsets.banner, baseY + lineHeight * (b + 2));
        }

        // Line 6: Financial Ticker
        drawSeamlessLine(TAPE_TICKER, cachedWidths.ticker, offsets.ticker, baseY + lineHeight * 7);

        // Line 7: Genesis Quote
        drawSeamlessLine(TAPE_GENESIS, cachedWidths.genesis, offsets.genesis, baseY + lineHeight * 8);

        // Line 8: Medallions
        drawSeamlessLine(TAPE_MEDALLIONS, cachedWidths.medallions, offsets.medallions, baseY + lineHeight * 9);

        // Line 9: Hash Telemetry
        drawSeamlessLine(TAPE_HASH, cachedWidths.hash, offsets.hash, baseY + lineHeight * 10);
      }
    }

    // -----------------------------------------------------------------------
    // Animation Loop with Background Sleep
    // -----------------------------------------------------------------------
    function loop() {
      if (!state.asciiEnabled) return;
      renderFrame();
      animationFrameId = requestAnimationFrame(loop);
    }

    function startLoop() {
      if (!animationFrameId && state.asciiEnabled) {
        cachedWidths = null; // Re-measure on restart
        animationFrameId = requestAnimationFrame(loop);
      }
    }

    function stopLoop() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopLoop();
      } else if (state.asciiEnabled) {
        startLoop();
      }
    });

    if (state.asciiEnabled) {
      startLoop();
    }
  }

  // -------------------------------------------------------------------------
  // 3. RESEARCH TABLE (EXCEL-LIKE WITH DYNAMIC COLUMNS & ROWS)
  // -------------------------------------------------------------------------
  function initResearchTable() {
    renderResearchTable();

    // Add Row button
    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        const newRow = { id: 'row_' + Date.now() };
        (state.research.columns || []).forEach(col => {
          newRow[col.id] = '';
        });
        state.research.rows.push(newRow);
        saveJSON(KEYS.RESEARCH, state.research);
        renderResearchTable();
        showToast('New row added');

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

        const colId = 'col_' + Date.now();
        state.research.columns.push({
          id: colId,
          name: colName,
        });

        // Initialize key in all existing rows
        state.research.rows.forEach(r => {
          if (r[colId] === undefined) r[colId] = '';
        });

        saveJSON(KEYS.RESEARCH, state.research);
        renderResearchTable();
        closeModal('addColModal');
        input.value = '';
        showToast(`Column "${colName}" added`);
      });
    }

    // Reset Table button
    const resetBtn = document.getElementById('resetTableBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset research table to default 3 columns (SOURCE, PROJECT, LINK)?')) {
          state.research = JSON.parse(JSON.stringify(DEFAULT_RESEARCH));
          saveJSON(KEYS.RESEARCH, state.research);
          renderResearchTable();
          showToast('Research table reset');
        }
      });
    }
  }

  function renderResearchTable() {
    const thead = document.getElementById('researchTableHead');
    const tbody = document.getElementById('researchTableBody');
    const countBadge = document.getElementById('researchCountBadge');
    const statsText = document.getElementById('researchStatsText');
    if (!thead || !tbody) return;

    const cols = state.research.columns || [];
    const rows = state.research.rows || [];

    if (countBadge) countBadge.textContent = `${rows.length} ROWS`;
    if (statsText) statsText.textContent = `${rows.length} ROWS • ${cols.length} COLUMNS`;

    // Render Table Header
    let headHtml = `
      <th class="w-10 text-center text-[var(--pt-ink-muted)]">#</th>
    `;
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
          state.research.columns = state.research.columns.filter(c => c.id !== colId);
          state.research.rows.forEach(r => {
            delete r[colId];
          });
          saveJSON(KEYS.RESEARCH, state.research);
          renderResearchTable();
          showToast(`Column "${colName}" removed`);
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
        const row = state.research.rows.find(r => r.id === rowId);
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

        state.projects.unshift(newProject);
        state.activeProjectId = newProject.id;
        saveJSON(KEYS.PROJECTS, state.projects);
        renderProjectTable();
        showToast(`✓ Threw "${projName}" into Project Table!`);
      });
    });

    // Attach row delete listeners
    tbody.querySelectorAll('.row-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rowId = btn.dataset.rowId;
        state.research.rows = state.research.rows.filter(r => r.id !== rowId);
        saveJSON(KEYS.RESEARCH, state.research);
        renderResearchTable();
        showToast('Row deleted');
      });
    });

    // Attach cell input listeners for inline auto-save
    tbody.querySelectorAll('.table-cell-input').forEach(input => {
      input.addEventListener('input', () => {
        const rowId = input.dataset.rowId;
        const colId = input.dataset.colId;
        const targetRow = state.research.rows.find(r => r.id === rowId);
        if (targetRow) {
          targetRow[colId] = input.value;
          saveJSON(KEYS.RESEARCH, state.research);
        }
      });

      input.addEventListener('blur', () => {
        const rowId = input.dataset.rowId;
        const colId = input.dataset.colId;
        const targetRow = state.research.rows.find(r => r.id === rowId);
        if (targetRow) {
          targetRow[colId] = input.value;
          saveJSON(KEYS.RESEARCH, state.research);
          renderResearchTable();
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // 4. PROJECT TABLE & DETAIL POPUP MODAL
  // -------------------------------------------------------------------------
  function initProjectTable() {
    renderProjectTable();

    // Clear all projects button
    const clearBtn = document.getElementById('clearProjectsBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all enrolled projects from this table?')) {
          state.projects = [];
          state.activeProjectId = null;
          saveJSON(KEYS.PROJECTS, state.projects);
          renderProjectTable();
          showToast('Project table cleared');
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
        if (!state.activeProjectId) return;
        const currentProj = state.projects.find(p => p.id === state.activeProjectId);
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
          saveJSON(KEYS.PROJECTS, state.projects);
          if (modalSaveStatus) {
            modalSaveStatus.textContent = '● SAVED';
            modalSaveStatus.className = 'retro-badge retro-badge-positive';
          }
        }, 300);
      });
    }
  }

  function openProjectDetailModal(projId) {
    const proj = state.projects.find(p => p.id === projId);
    if (!proj) return;

    state.activeProjectId = projId;

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
  }

  function renderProjectTable() {
    const tbody = document.getElementById('projectTableBody');
    const countBadge = document.getElementById('projectCountBadge');
    const footerText = document.getElementById('projectFooterText');
    const hoverPopover = document.getElementById('projectHoverPopover');
    const hoverTitle = document.getElementById('hoverPopoverTitle');
    const hoverContent = document.getElementById('hoverPopoverContent');

    if (!tbody) return;

    const list = state.projects || [];
    if (countBadge) countBadge.textContent = `${list.length} PROJECTS`;
    if (footerText) footerText.textContent = `${list.length} PROJECTS ENROLLED`;

    // Empty state
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

    // Render table rows
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

    // Attach row events
    tbody.querySelectorAll('tr').forEach(tr => {
      const projId = tr.dataset.projId;
      const proj = list.find(p => p.id === projId);
      if (!proj) return;

      // Click row -> open detail modal popup
      tr.addEventListener('click', (e) => {
        if (e.target.closest('.proj-del-btn') || e.target.closest('.proj-status-select') || e.target.closest('a')) {
          return;
        }
        openProjectDetailModal(projId);
      });

      // Hover row -> show read-only detail preview popover
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

    // Attach Status Select listeners
    tbody.querySelectorAll('.proj-status-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = sel.dataset.projId;
        const item = list.find(p => p.id === id);
        if (item) {
          item.status = sel.value;
          saveJSON(KEYS.PROJECTS, state.projects);
          renderProjectTable();
          showToast(`Status updated: ${item.status}`);
        }
      });
    });

    // Attach Delete Button listeners
    tbody.querySelectorAll('.proj-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.projId;
        if (confirm('Delete this project?')) {
          state.projects = state.projects.filter(p => p.id !== id);
          if (state.activeProjectId === id) {
            state.activeProjectId = state.projects.length > 0 ? state.projects[0].id : null;
          }
          saveJSON(KEYS.PROJECTS, state.projects);
          renderProjectTable();
          showToast('Project removed');
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // 5. BUFFER // SCRATCHPAD (NOTES)
  // -------------------------------------------------------------------------
  function initScratchpad() {
    const textarea = document.getElementById('scratchpadText');
    const status = document.getElementById('noteSaveStatus');
    const stats = document.getElementById('noteStats');

    textarea.value = state.note;
    updateNoteStats();

    let saveTimeout = null;

    textarea.addEventListener('input', () => {
      status.textContent = '● TYPING...';
      status.className = 'retro-badge retro-badge-accent';
      updateNoteStats();

      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        state.note = textarea.value;
        localStorage.setItem(KEYS.NOTES, state.note);
        status.textContent = '● SAVED';
        status.className = 'retro-badge retro-badge-positive';
        updateTelemetryStats();
      }, 300);
    });

    function updateNoteStats() {
      const val = textarea.value;
      const chars = val.length;
      const words = val.trim() ? val.trim().split(/\s+/).length : 0;
      stats.textContent = `${words} WORDS • ${chars} CHARS`;
    }

    document.getElementById('copyNoteBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(textarea.value).then(() => {
        showToast('Notes copied to clipboard!');
      }).catch(() => {
        showToast('Failed to copy', 'error');
      });
    });

    document.getElementById('downloadNoteBtn').addEventListener('click', () => {
      const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
      const now = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `workspace-notes-${now}.txt`);
      showToast('Notes downloaded as .txt');
    });

    document.getElementById('clearNoteBtn').addEventListener('click', () => {
      if (confirm('Clear entire scratchpad buffer?')) {
        textarea.value = '';
        state.note = '';
        localStorage.setItem(KEYS.NOTES, '');
        updateNoteStats();
        status.textContent = '● CLEARED';
        updateTelemetryStats();
        showToast('Notes buffer cleared');
      }
    });
  }

  // -------------------------------------------------------------------------
  // 6. CHRONO // FOCUS TIMER (POMODORO)
  // -------------------------------------------------------------------------
  function initTimer() {
    const display = document.getElementById('timerDisplay');
    const modeLabel = document.getElementById('timerModeLabel');
    const startBtn = document.getElementById('timerStartBtn');
    const resetBtn = document.getElementById('timerResetBtn');
    const modeBtns = document.querySelectorAll('.timer-mode-btn');
    const soundToggle = document.getElementById('timerSoundToggle');
    const sessionsBadge = document.getElementById('pomodoroCountBadge');
    const sessionsCount = document.getElementById('completedSessionsCount');

    function updateSessions() {
      sessionsBadge.textContent = `ROUND ${state.timerSessions}`;
      sessionsCount.textContent = state.timerSessions;
    }

    updateSessions();
    renderTime();

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        pauseTimer();
        modeBtns.forEach(b => b.classList.remove('retro-btn-primary'));
        btn.classList.add('retro-btn-primary');

        state.timerState.mode = btn.dataset.mode;
        state.timerState.totalSeconds = parseInt(btn.dataset.time, 10);
        state.timerState.remainingSeconds = state.timerState.totalSeconds;

        if (state.timerState.mode === 'work') modeLabel.textContent = '[ FOCUS SESSION ]';
        if (state.timerState.mode === 'short') modeLabel.textContent = '[ SHORT BREAK ]';
        if (state.timerState.mode === 'long') modeLabel.textContent = '[ EXTENDED REST ]';

        renderTime();
      });
    });

    startBtn.addEventListener('click', () => {
      if (state.timerState.isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    });

    resetBtn.addEventListener('click', () => {
      pauseTimer();
      state.timerState.remainingSeconds = state.timerState.totalSeconds;
      renderTime();
    });

    soundToggle.addEventListener('click', () => {
      state.timerSound = !state.timerSound;
      localStorage.setItem(KEYS.TIMER_SOUND, state.timerSound);
      soundToggle.textContent = state.timerSound ? 'BEEP: ON' : 'BEEP: OFF';
      showToast(`Timer audio: ${state.timerSound ? 'Enabled' : 'Muted'}`);
    });

    soundToggle.textContent = state.timerSound ? 'BEEP: ON' : 'BEEP: OFF';

    function startTimer() {
      state.timerState.isRunning = true;
      startBtn.textContent = 'PAUSE';
      startBtn.classList.remove('retro-btn-primary');
      startBtn.classList.add('retro-btn-danger');

      state.timerState.intervalId = setInterval(() => {
        if (state.timerState.remainingSeconds > 0) {
          state.timerState.remainingSeconds--;
          renderTime();
        } else {
          pauseTimer();
          timerFinished();
        }
      }, 1000);
    }

    function pauseTimer() {
      state.timerState.isRunning = false;
      clearInterval(state.timerState.intervalId);
      startBtn.textContent = 'START';
      startBtn.classList.remove('retro-btn-danger');
      startBtn.classList.add('retro-btn-primary');
    }

    function renderTime() {
      const mins = Math.floor(state.timerState.remainingSeconds / 60);
      const secs = state.timerState.remainingSeconds % 60;
      display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function timerFinished() {
      if (state.timerSound) {
        playRetroBeep();
      }

      if (state.timerState.mode === 'work') {
        state.timerSessions++;
        localStorage.setItem(KEYS.TIMER_SESSIONS, state.timerSessions);
        updateSessions();
        showToast('🎯 Focus round completed! Take a break.', 'positive');
      } else {
        showToast('🔔 Break over! Ready to focus?', 'positive');
      }
    }
  }

  function playRetroBeep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(587.33, 0, 0.12);
      playTone(880, 0.14, 0.25);
    } catch (e) {
      console.warn('AudioContext beep error', e);
    }
  }

  // -------------------------------------------------------------------------
  // 7. LOG // DAILY HABITS
  // -------------------------------------------------------------------------
  function initHabits() {
    checkDayRollover();
    renderHabits();

    document.getElementById('addHabitBtn').addEventListener('click', () => {
      openModal('addHabitModal');
      document.getElementById('habitNameInput').focus();
    });

    document.getElementById('addHabitForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('habitNameInput');
      const name = input.value.trim();
      if (!name) return;

      state.habits.push({
        id: 'hb_' + Date.now(),
        name,
        completed: false,
        streak: 0,
      });

      saveJSON(KEYS.HABITS, state.habits);
      renderHabits();
      closeModal('addHabitModal');
      input.value = '';
      showToast('Daily habit added');
    });

    document.getElementById('resetHabitsBtn').addEventListener('click', () => {
      if (confirm('Reset status for all habits today?')) {
        state.habits.forEach(h => h.completed = false);
        saveJSON(KEYS.HABITS, state.habits);
        renderHabits();
        showToast('Habits reset for today');
      }
    });
  }

  function checkDayRollover() {
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = localStorage.getItem(KEYS.HABIT_DATE);

    if (lastDate && lastDate !== today) {
      state.habits.forEach(h => {
        h.completed = false;
      });
      saveJSON(KEYS.HABITS, state.habits);
    }
    localStorage.setItem(KEYS.HABIT_DATE, today);
  }

  function renderHabits() {
    const list = document.getElementById('habitList');
    const badge = document.getElementById('habitProgressBadge');

    const total = state.habits.length;
    const completed = state.habits.filter(h => h.completed).length;
    badge.textContent = `${completed}/${total} TODAY`;

    if (state.habits.length === 0) {
      list.innerHTML = `<div class="text-center py-6 font-mono text-xs text-[var(--pt-ink-muted)]">No daily habits configured. Click + ADD above.</div>`;
      return;
    }

    list.innerHTML = state.habits.map(h => {
      return `
        <div class="todo-row ${h.completed ? 'completed' : ''}" data-habit-id="${h.id}">
          <input type="checkbox" class="retro-checkbox habit-checkbox" ${h.completed ? 'checked' : ''} />
          <span class="todo-text flex-1 text-xs font-mono break-all">${escapeHTML(h.name)}</span>
          <span class="retro-badge retro-badge-accent text-[9px] py-0 px-1 font-mono">${h.streak || 0}d 🔥</span>
          <button class="habit-delete-btn text-xs text-[var(--pt-ink-muted)] hover:text-[var(--pt-negative)] px-1 font-bold">✕</button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.todo-row').forEach(row => {
      const id = row.dataset.habitId;
      const chk = row.querySelector('.habit-checkbox');
      const del = row.querySelector('.habit-delete-btn');

      chk.addEventListener('change', () => {
        const item = state.habits.find(h => h.id === id);
        if (item) {
          item.completed = chk.checked;
          if (item.completed) item.streak = (item.streak || 0) + 1;
          else item.streak = Math.max(0, (item.streak || 1) - 1);
          saveJSON(KEYS.HABITS, state.habits);
          renderHabits();
        }
      });

      del.addEventListener('click', () => {
        state.habits = state.habits.filter(h => h.id !== id);
        saveJSON(KEYS.HABITS, state.habits);
        renderHabits();
        showToast('Habit removed');
      });
    });
  }

  // -------------------------------------------------------------------------
  // 8. TELEMETRY & SYSTEM STORAGE MANAGER
  // -------------------------------------------------------------------------
  function initTelemetry() {
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

  function updateTelemetryStats() {
    let totalBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (localStorage[key].length + key.length) * 2;
      }
    }
    const kb = (totalBytes / 1024).toFixed(1);
    const usage = document.getElementById('storageUsageStat');
    const notes = document.getElementById('storageNotesStat');

    if (usage) usage.textContent = `${kb} KB / 5.0 MB`;
    if (notes) notes.textContent = `${state.note.length} chars`;
  }

  function exportBackup() {
    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      theme: state.theme,
      asciiEnabled: state.asciiEnabled,
      research: state.research,
      projects: state.projects,
      notes: state.note,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const now = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `paper-workspace-backup-${now}.json`);
    showToast('Backup JSON exported successfully');
  }

  function handleFileImport(e) {
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
          state.research = data.research;
          saveJSON(KEYS.RESEARCH, state.research);
          renderResearchTable();
        }

        if (Array.isArray(data.projects)) {
          state.projects = data.projects;
          saveJSON(KEYS.PROJECTS, state.projects);
          renderProjectTable();
        }

        if (typeof data.notes === 'string') {
          state.note = data.notes;
          localStorage.setItem(KEYS.NOTES, state.note);
          document.getElementById('scratchpadText').value = state.note;
        }

        if (typeof data.asciiEnabled === 'boolean') {
          state.asciiEnabled = data.asciiEnabled;
          localStorage.setItem(KEYS.ASCII_BG, state.asciiEnabled);
        }

        if (data.theme) {
          state.theme = data.theme;
          localStorage.setItem(KEYS.THEME, state.theme);
          applyTheme(state.theme);
        }

        updateTelemetryStats();
        closeModal('backupModal');
        showToast('Backup restored successfully!', 'positive');
      } catch (err) {
        console.error('Import error', err);
        showToast('Failed to import backup: Invalid JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // -------------------------------------------------------------------------
  // 9. MODAL SYSTEM
  // -------------------------------------------------------------------------
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

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  // -------------------------------------------------------------------------
  // 10. KEYBOARD SHORTCUTS
  // -------------------------------------------------------------------------
  function initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.retro-modal-overlay:not(.hidden)').forEach(modal => {
          modal.classList.add('hidden');
        });
      }
    });
  }

  // -------------------------------------------------------------------------
  // 11. UTILITIES: TOAST, DOWNLOAD, ESCAPE
  // -------------------------------------------------------------------------
  let toastTimer = null;
  function showToast(message, type = 'normal') {
    const toast = document.getElementById('retroToast');
    const msgEl = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');

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

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
