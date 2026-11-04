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
