/**
 * PROFIT & LOSS running ticker (bottom strip, thin like the top ticker).
 * Computed live from the Degen // Trade & LP Journal (store 'journal'):
 *  - LP PRINTING  <- type LP (fees / liquidity rewards)
 *  - DEGEN        <- type TRADE
 *  - NFT SOLD     <- type NFT, or pair/action/notes mentioning NFT/mint/sold
 *  - OTHER        <- everything else with a PnL
 *  - LOSSES       <- negative PnL entries (where the loss came from)
 * PnL strings like "+$420 (Fees)" / "-$150" are parsed for the $ amount.
 * If the journal has no PnL data yet, pills show the placeholder running
 * text "PROFIT AND LOST SHOW HERE" instead of numbers.
 * NOTE: innerHTML only interpolates escapeHtml()-escaped strings.
 */
import { bus } from '../core/bus.js';
import { store } from '../core/store.js';

function parsePnl(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).replace(/,/g, '');
  const m = s.match(/([+-]?)\s*\$\s*([\d.]+)/);
  if (!m) return null;
  const val = parseFloat(m[2]);
  if (Number.isNaN(val)) return null;
  return m[1] === '-' ? -val : val;
}

function money(n) {
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function categorize(entry) {
  const t = String(entry.type || '').toUpperCase();
  const hay = `${entry.pair || ''} ${entry.action || ''} ${entry.notes || ''}`.toUpperCase();
  if (t === 'NFT' || /\bNFT\b|MINT|MINTED|SOLD/.test(hay)) return 'NFT SOLD';
  if (t === 'LP') return 'LP PRINTING';
  if (t === 'TRADE') return 'DEGEN';
  return 'OTHER';
}

function computePnl() {
  const journal = store.get('journal') || [];
  const buckets = { 'LP PRINTING': [], 'DEGEN': [], 'NFT SOLD': [], 'OTHER': [] };
  const losses = [];
  let total = 0;
  let withPnl = 0;
  for (const e of journal) {
    const v = parsePnl(e.pnl);
    if (v === null) continue;
    withPnl++;
    total += v;
    buckets[categorize(e)].push({ entry: e, value: v });
    if (v < 0) losses.push({ entry: e, value: v });
  }
  return { journal, buckets, losses, total, withPnl };
}

function pillHtml(item) {
  const badgeClass = item.badgeType === 'negative' ? 'retro-badge-negative' : item.badgeType === 'cyan' ? 'retro-badge-cyan' : item.badgeType === 'accent' ? 'retro-badge-accent' : 'retro-badge-positive';
  const statsRows = Object.entries(item.stats || {}).map(([k, v]) => `
    <div class="flex justify-between items-center text-[9px] gap-2 py-0.5">
      <span class="text-[var(--pt-ink-muted)] uppercase">${escapeHtml(k)}:</span>
      <span class="font-bold text-[var(--pt-ink)] truncate max-w-[170px]">${escapeHtml(v)}</span>
    </div>`).join('');
  return `
    <div class="agent-pill group" data-pnl-id="${escapeHtml(item.id)}">
      <div class="agent-pill-inner">
        <span class="agent-pill-icon">${item.icon}</span>
        <span class="agent-pill-title">${escapeHtml(item.name)}</span>
        <span class="retro-badge ${badgeClass} text-[8px] py-0 px-1 font-mono">${escapeHtml(item.badge)}</span>
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
}

export function initPnlTicker() {
  const track = document.getElementById('pnlTickerTrack');
  if (!track) return;

  function render() {
    const { journal, buckets, losses, total, withPnl } = computePnl();
    let pills;
    if (!withPnl) {
      // Nothing to show yet — placeholder running text, per operator request.
      pills = [
        { id: 'pnl.placeholder', name: 'PROFIT AND LOST SHOW HERE', icon: '💹', badge: 'WAITING', badgeType: 'cyan', sub: 'Log a trade / LP / NFT sale in the journal above', type: 'P&L', status: 'IDLE', stats: { source: 'Degen // Trade & LP Journal', hint: 'PnL per entry, e.g. +$420 (Fees)' } },
        { id: 'pnl.placeholder2', name: 'PROFIT AND LOST SHOW HERE', icon: '📊', badge: 'WAITING', badgeType: 'accent', sub: 'LP printing • Degen • NFT sold • Losses', type: 'P&L', status: 'IDLE', stats: { categories: 'LP PRINTING / DEGEN / NFT SOLD / OTHER / LOSSES' } },
      ];
    } else {
      const bucketPill = (key, icon) => {
        const rows = buckets[key];
        const sum = rows.reduce((a, r) => a + r.value, 0);
        return {
          id: `pnl.${key}`, name: key, icon,
          badge: rows.length ? money(sum) : '$0',
          badgeType: sum < 0 ? 'negative' : 'positive',
          sub: rows.length ? `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}` : 'no entries yet',
          type: 'PROFIT', status: rows.length ? 'LIVE' : 'IDLE',
          stats: rows.length ? Object.fromEntries(rows.map((r) => [`${r.entry.date || ''} ${r.entry.pair || r.entry.action || ''}`, money(r.value)])) : { status: 'no entries yet' },
        };
      };
      const lossSum = losses.reduce((a, r) => a + r.value, 0);
      pills = [
        { id: 'pnl.total', name: 'TOTAL P&L', icon: '💹', badge: money(total), badgeType: total < 0 ? 'negative' : 'positive', sub: `${withPnl} entries with PnL / ${journal.length} total`, type: 'P&L', status: 'LIVE', stats: { profit: money([...Object.values(buckets)].flat().filter((r) => r.value > 0).reduce((a, r) => a + r.value, 0)), losses: money(lossSum), entries: `${withPnl}` } },
        bucketPill('LP PRINTING', '🖨️'),
        bucketPill('DEGEN', '🔥'),
        bucketPill('NFT SOLD', '🖼️'),
        bucketPill('OTHER', '📦'),
        {
          id: 'pnl.losses', name: 'LOSSES', icon: '📉',
          badge: losses.length ? money(lossSum) : '$0',
          badgeType: losses.length ? 'negative' : 'positive',
          sub: losses.length ? `${losses.length} losing entr${losses.length === 1 ? 'y' : 'ies'} — where it went` : 'no losses recorded',
          type: 'LOSS', status: losses.length ? 'LIVE' : 'CLEAN',
          stats: losses.length ? Object.fromEntries(losses.map((r) => [`${r.entry.date || ''} ${r.entry.pair || r.entry.action || ''} (${categorize(r.entry)})`, money(r.value)])) : { status: 'clean — no losing entries' },
        },
      ];
    }
    const html = pills.map(pillHtml).join('');
    track.innerHTML = html + html; // duplicate set for seamless marquee loop
    track.querySelectorAll('.agent-pill').forEach((pill) => {
      pill.addEventListener('mouseenter', () => track.classList.add('ticker-paused'));
      pill.addEventListener('mouseleave', () => track.classList.remove('ticker-paused'));
    });
  }

  render();
  bus.on('store:changed:journal', render);
  bus.on('store:hydrated_from_server', render);
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
