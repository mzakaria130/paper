/**
 * SECURITY // AUDIT REPORT — bottom running card (like the top ticker card).
 * Lazy: nothing runs until RUN AUDIT is pressed, which triggers
 * registry.executeAction('audit.scan') and auto-loads the security agent.
 * Shows best-practice checklist ticking live, findings, fix proposals,
 * and the full Markdown report with copy/download. Last report persists
 * via store key 'auditReport' (paper_audit_report).
 * NOTE: innerHTML below only ever interpolates escapeHtml()-escaped
 * strings (project names, check names, evidence) — no raw user HTML.
 */
import { bus } from '../core/bus.js';
import { store } from '../core/store.js';
import { registry } from '../core/registry.js';
import { showToast, downloadBlob } from '../core/utils.js';

let lastAudit = null;
let lastReport = '';

export function initSecurityCard() {
  const card = document.getElementById('securityCard');
  if (!card) return;

  const select = document.getElementById('auditProjectSelect');
  const codeInput = document.getElementById('auditCodeInput');
  const runBtn = document.getElementById('runAuditBtn');
  const fixesBtn = document.getElementById('showFixesBtn');
  const reportBtn = document.getElementById('downloadReportBtn');
  const copyBtn = document.getElementById('copyReportBtn');
  const statusBadge = document.getElementById('auditStatusBadge');
  const scoreEl = document.getElementById('auditScore');
  const checklistEl = document.getElementById('auditChecklist');
  const findingsEl = document.getElementById('auditFindings');
  const fixesEl = document.getElementById('auditFixes');
  const reportEl = document.getElementById('auditReportPre');
  const metaEl = document.getElementById('auditMeta');
  const tickerTrack = document.getElementById('securityTickerTrack');

  // ---- Bottom security running ticker (taller twin of the top ticker) ----
  function securityPills() {
    const a = lastAudit;
    const checks = a ? a.checks : [];
    const passed = checks.filter((c) => c.status === 'PASS').length;
    const findings = a ? (a.findings || []) : [];
    const flags = findings.filter((f) => ['FLAG', 'REVIEW'].includes(f.status)).length;
    const fixes = a ? checks.filter((c) => c.fix).length : 0;
    return [
      { id: 'sec.auditor', name: 'SECURITY AUDITOR', icon: '🛡️', badge: a ? a.score : 'LAZY', badgeType: a ? 'positive' : 'accent', sub: a ? `Target: ${a.target}` : 'On-demand — press RUN AUDIT', type: 'AGENT', status: a ? 'DONE' : 'IDLE', stats: { mode: 'Lazy / on-demand', engine: 'audit-engine.js (shared)', checks: '12 best-practice rules' } },
      { id: 'sec.checks', name: 'CHECKLIST', icon: '✅', badge: a ? `${passed}/${checks.length} PASS` : '12 RULES', badgeType: 'cyan', sub: 'Pragma • Reentrancy • tx.origin • …', type: 'CHECKLIST', status: a ? 'DONE' : 'READY', stats: a ? Object.fromEntries(checks.map((c) => [c.name, c.status])) : { rules: 'pragma, reentrancy, tx.origin, delegatecall, oracle, access, calls, selfdestruct, randomness, front-run, visibility, loops' } },
      { id: 'sec.findings', name: 'VULNERABILITIES', icon: '⚠️', badge: a ? `${findings.length} FOUND` : '—', badgeType: flags ? 'accent' : 'positive', sub: a ? `${flags} need review/fix` : 'Run an audit to scan', type: 'FINDINGS', status: a ? 'DONE' : 'IDLE', stats: a ? Object.fromEntries(findings.map((f) => [`${f.name} [${f.severity}]`, f.status])) : { status: 'No scan yet' } },
      { id: 'sec.fixes', name: 'FIX PROPOSALS', icon: '🛠️', badge: a ? `${fixes} FIXES` : '—', badgeType: 'cyan', sub: 'Code snippets per finding', type: 'FIXES', status: a ? 'DONE' : 'IDLE', stats: { apply: 'Opt-in: audit.fix --apply appends to project detail', report: 'Markdown + download in card above' } },
      { id: 'sec.lastrun', name: 'LAST RUN', icon: '🕐', badge: a ? 'DONE' : 'NEVER', badgeType: a ? 'positive' : 'accent', sub: a ? String(a.timestamp).slice(0, 19).replace('T', ' ') : 'Press RUN AUDIT in the card above', type: 'TELEMETRY', status: a ? 'DONE' : 'IDLE', stats: a ? { target: a.target, score: a.score, timestamp: a.timestamp } : { status: 'No run recorded' } },
      { id: 'sec.mode', name: 'LAZY MODE', icon: '💤', badge: 'ON DEMAND', badgeType: 'accent', sub: 'Loads only on RUN — zero idle cost', type: 'MODE', status: 'READY', stats: { browser: 'PaperWorkspace.agents.ensure("agent.security_auditor")', bridge: 'paper_run_agent', alwaysOn: 'paper_agent_mode=always (opt-in)' } },
    ];
  }

  function renderSecurityTicker() {
    if (!tickerTrack) return;
    const pills = securityPills();
    const html = pills.map((item) => {
      const badgeClass = item.badgeType === 'cyan' ? 'retro-badge-cyan' : item.badgeType === 'accent' ? 'retro-badge-accent' : 'retro-badge-positive';
      const statsRows = Object.entries(item.stats || {}).map(([k, v]) => `
        <div class="flex justify-between items-center text-[9px] gap-2 py-0.5">
          <span class="text-[var(--pt-ink-muted)] uppercase">${escapeHtml(k)}:</span>
          <span class="font-bold text-[var(--pt-ink)] truncate max-w-[180px]">${escapeHtml(v)}</span>
        </div>`).join('');
      return `
        <div class="agent-pill group" data-agent-id="${escapeHtml(item.id)}">
          <div class="agent-pill-inner">
            <span class="agent-pill-icon">${item.icon}</span>
            <span class="agent-pill-title">${escapeHtml(item.name)}</span>
            <span class="retro-badge ${badgeClass} text-[8px] py-0 px-1 font-mono">${escapeHtml(item.badge)}</span>
            <span class="agent-pill-sub">${escapeHtml(item.sub)}</span>
          </div>
          <div class="agent-pill-popover">
            <div class="flex items-center justify-between pb-1 mb-1.5 border-b border-[var(--pt-border)] text-[10px]">
              <span class="font-bold text-[var(--pt-ink)] flex items-center gap-1.5"><span>${item.icon}</span><span>${escapeHtml(item.name)}</span></span>
              <span class="retro-badge ${badgeClass} text-[8px] py-0 px-1">${escapeHtml(item.type)}</span>
            </div>
            <p class="text-[10px] text-[var(--pt-ink-muted)] mb-2 leading-tight">${escapeHtml(item.sub)}</p>
            <div class="bg-[var(--pt-panel-sunken)] p-1.5 rounded-[var(--pt-radius-xs)] border border-[var(--pt-border)] space-y-0.5 mb-1.5">${statsRows}</div>
            <div class="flex items-center justify-between text-[8px] font-mono text-[var(--pt-ink-faint)] pt-1 border-t border-[var(--pt-border)]">
              <span>STATUS: ${escapeHtml(item.status)}</span><span>AUTONOMOUS // RUNNING</span>
            </div>
          </div>
        </div>`;
    }).join('');
    tickerTrack.innerHTML = html + html; // duplicate for seamless marquee loop
    tickerTrack.querySelectorAll('.agent-pill').forEach((pill) => {
      pill.addEventListener('mouseenter', () => tickerTrack.classList.add('ticker-paused'));
      pill.addEventListener('mouseleave', () => tickerTrack.classList.remove('ticker-paused'));
    });
  }

  function refreshProjects() {
    const projects = store.get('projects') || [];
    const current = select.value;
    select.innerHTML = '<option value="__paste__">PASTE CODE (below)</option>' +
      projects.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    if ([...select.options].some((o) => o.value === current)) select.value = current;
    else if (projects.length) select.value = projects[0].id;
    loadProjectCode();
  }

  function loadProjectCode() {
    const pid = select.value;
    if (pid && pid !== '__paste__') {
      const proj = (store.get('projects') || []).find((p) => p.id === pid);
      codeInput.value = proj ? (proj.detail || '') : '';
    }
  }

  function setStatus(text, cls) {
    statusBadge.textContent = text;
    statusBadge.className = `retro-badge text-[9px] py-0.5 ${cls} ${text === 'RUNNING' ? 'animate-pulse' : ''}`;
  }

  function statusClass(s) {
    if (s === 'PASS') return 'retro-badge-positive';
    if (s === 'FLAG') return 'retro-badge-negative';
    if (s === 'INFO') return 'retro-badge-cyan';
    return 'retro-badge-accent';
  }

  function renderChecklist(checks, revealed = checks.length) {
    checklistEl.innerHTML = checks.slice(0, revealed).map((c) => `
      <div class="flex items-center justify-between gap-2 py-1 border-b border-[var(--pt-border)] last:border-0">
        <span class="text-[11px]">${escapeHtml(c.name)}</span>
        <span class="retro-badge ${statusClass(c.status)} text-[8px] py-0 px-1">${escapeHtml(c.status)}</span>
      </div>`).join('') || '<p class="text-[11px] text-[var(--pt-ink-muted)] py-2">Press RUN AUDIT to execute the best-practice checklist.</p>';
  }

  function renderFindings(audit) {
    const items = audit.findings || [];
    findingsEl.innerHTML = items.length ? items.map((f) => `
      <div class="py-1.5 border-b border-[var(--pt-border)] last:border-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="retro-badge ${statusClass(f.status)} text-[8px] py-0 px-1">${escapeHtml(f.status)}</span>
          <span class="text-[11px] font-bold">${escapeHtml(f.name)}</span>
          <span class="text-[9px] text-[var(--pt-ink-muted)]">[${escapeHtml(f.severity)}]</span>
        </div>
        <p class="text-[10px] text-[var(--pt-ink-muted)] mt-0.5">${escapeHtml(f.evidence || f.bestPractice || '')}</p>
      </div>`).join('') : '<p class="text-[11px] py-2 text-[var(--pt-ink-muted)]">No vulnerabilities flagged by these checks. 🎉</p>';
  }

  function renderFixes(fixes) {
    fixesEl.innerHTML = fixes.length ? fixes.map((f) => `
      <div class="mb-3">
        <p class="text-[11px] font-bold mb-1">${escapeHtml(f.check)} <span class="text-[9px] text-[var(--pt-ink-muted)]">[${escapeHtml(f.severity)}]</span></p>
        <pre class="retro-input p-2 text-[10px] leading-relaxed whitespace-pre-wrap">${escapeHtml(f.fix)}</pre>
      </div>`).join('') : '<p class="text-[11px] text-[var(--pt-ink-muted)]">No fixes required.</p>';
  }

  async function runAudit() {
    const code = codeInput.value || '';
    const pid = select.value && select.value !== '__paste__' ? select.value : null;
    setStatus('RUNNING', 'retro-badge-accent');
    scoreEl.textContent = '…';
    checklistEl.innerHTML = '<p class="text-[11px] py-2 animate-pulse">Loading security agent (lazy)…</p>';
    fixesEl.innerHTML = ''; reportEl.textContent = '';
    fixesBtn.disabled = true; reportBtn.disabled = true; copyBtn.disabled = true;

    // Trigger lazy load + scan through the registry (agent auto-loads on demand).
    const audit = await registry.executeAction('audit.scan', { contractCode: code, projectId: pid, targetUrl: pid || 'pasted code' });
    lastAudit = audit;

    // Visual running sequence: tick the checklist in, like the top ticker.
    renderChecklist(audit.checks, 0);
    for (let i = 1; i <= audit.checks.length; i++) {
      renderChecklist(audit.checks, i);
      await new Promise((r) => setTimeout(r, 90));
    }
    scoreEl.textContent = audit.score;
    renderFindings(audit);
    renderSecurityTicker();
    setStatus('DONE', 'retro-badge-positive');
    metaEl.textContent = `TARGET: ${audit.target} • ${audit.timestamp} • ${audit.checks.length} CHECKS`;

    // Fixes + report from the same audit (no re-scan needed).
    const fixResult = await registry.executeAction('audit.fix', { contractCode: code, projectId: pid });
    renderFixes(fixResult.fixes || []);
    const reportResult = await registry.executeAction('audit.report', { contractCode: code, projectId: pid });
    lastReport = reportResult.report || '';
    reportEl.textContent = lastReport;
    try { store.set('auditReport', { score: audit.score, target: audit.target, timestamp: audit.timestamp, report: lastReport }); } catch { /* older store without key: still works in-memory */ }
    fixesBtn.disabled = false; reportBtn.disabled = false; copyBtn.disabled = false;
    showToast(`Audit complete — score ${audit.score}`);
  }

  runBtn.addEventListener('click', () => { runAudit().catch((e) => { setStatus('ERROR', 'retro-badge-negative'); showToast(`Audit failed: ${e.message}`, 'error'); }); });
  select.addEventListener('change', loadProjectCode);
  fixesBtn.addEventListener('click', () => { fixesEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  copyBtn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(lastReport); showToast('Report copied'); } catch { showToast('Copy failed', 'error'); } });
  reportBtn.addEventListener('click', () => {
    if (!lastReport) return;
    downloadBlob(new Blob([lastReport], { type: 'text/markdown' }), `paper-audit-report-${new Date().toISOString().slice(0, 10)}.md`);
    showToast('Report downloaded');
  });

  bus.on('store:changed:projects', refreshProjects);
  refreshProjects();
  renderChecklist([], 0);
  renderSecurityTicker();
  findingsEl.innerHTML = '<p class="text-[11px] py-2 text-[var(--pt-ink-muted)]">No audit run yet this session.</p>';

  // Restore last report if present.
  try {
    const saved = store.get('auditReport');
    if (saved && saved.report) {
      lastReport = saved.report;
      scoreEl.textContent = saved.score || '—';
      metaEl.textContent = `LAST REPORT: ${saved.target || ''} • ${saved.timestamp || ''}`;
      reportEl.textContent = saved.report;
      setStatus('DONE', 'retro-badge-positive');
      fixesBtn.disabled = false; reportBtn.disabled = false; copyBtn.disabled = false;
    }
  } catch { /* no saved report */ }
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
