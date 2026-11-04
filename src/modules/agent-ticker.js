/**
 * Running Agent & Library Status Ticker Tape
 * Emulates the Papertrade live pill ticker tape directly below the header.
 * Continuous smooth marquee scrolling from right-to-left.
 * Features:
 * - Hover on any individual pill halts the scrolling animation while hovered
 * - Rich Papertrade popover inspection card on hover (Agent status, latency, memory, uptime, actions)
 */
import { bus } from '../core/bus.js';
import { registry } from '../core/registry.js';

// Seed list of default active agents and connected libraries
const DEFAULT_ACTIVE_ENTITIES = [
  {
    id: 'agent.web3_journaler',
    name: 'WEB3 JOURNALER',
    type: 'AGENT',
    status: 'ACTIVE',
    icon: '₿',
    badge: 'ONLINE',
    badgeType: 'positive',
    sub: 'Strategy & LP Vault Logger',
    stats: {
      runtime: 'Worker / Local',
      latency: '24ms',
      actions: 'web3.mint, web3.swap, journal.record',
      uptime: '99.98%'
    }
  },
  {
    id: 'lib.viem',
    name: 'VIEM / ETHERS ADAPTER',
    type: 'LIBRARY',
    status: 'READY',
    icon: '⧫',
    badge: 'v2.18.4',
    badgeType: 'cyan',
    sub: 'EIP-1193 JSON-RPC Connector',
    stats: {
      provider: 'HyperEVM RPC / Browser',
      chains: 'Ethereum, Arbitrum, Hyperliquid',
      connected: 'Offline (Mock / Standby)'
    }
  },
  {
    id: 'agent.security_auditor',
    name: 'SECURITY AUDITOR',
    type: 'AGENT',
    status: 'ACTIVE',
    icon: '🛡️',
    badge: 'IDLE',
    badgeType: 'accent',
    sub: 'Static Analysis & Threat Modeling (lazy)',
    stats: {
      rules: '12 best-practice checks (pragma, reentrancy, tx.origin, ...)',
      mode: 'Lazy — runs on RUN AUDIT press',
      score: '— (run an audit)'
    }
  },
  {
    id: 'agent.lp_monitor',
    name: 'LP RANGE MONITOR',
    type: 'AGENT',
    status: 'ACTIVE',
    icon: '⚡',
    badge: 'IN RANGE',
    badgeType: 'positive',
    sub: 'Tick Interval Supervisor',
    stats: {
      monitoredPools: 'BTC/USDC HyperEVM',
      frequency: 'Sub-second',
      autoRebalance: 'Ready'
    }
  },
  {
    id: 'lib.local_storage',
    name: 'LOCALSTORE ENGINE',
    type: 'CORE',
    status: 'READY',
    icon: '💾',
    badge: 'PERSISTENT',
    badgeType: 'positive',
    sub: 'Client-Side Private State Engine',
    stats: {
      encryption: 'Local-only sandbox',
      quota: '5.0 MB (Allocated)',
      cloudExfiltration: '0% (Zero Cloud)'
    }
  },
  {
    id: 'agent.grok_connector',
    name: 'OPENCLAW / GROKBOT BRIDGE',
    type: 'AGENT',
    status: 'READY',
    icon: '🤖',
    badge: 'STANDBY',
    badgeType: 'cyan',
    sub: 'Headless Agent API Runtime',
    stats: {
      channel: 'window.PaperWorkspace',
      protocol: 'AGENT.md Directive',
      readiness: 'Awaiting Intent'
    }
  }
];

export function initAgentTicker() {
  const track = document.getElementById('agentTickerTrack');
  const viewport = document.getElementById('agentTickerViewport');
  if (!track || !viewport) return;

  renderTickerPills(track);

  // Pause on hover functionality:
  // When the user hovers over any pill, add 'ticker-paused' to the track
  track.querySelectorAll('.agent-pill').forEach(pill => {
    pill.addEventListener('mouseenter', () => {
      track.classList.add('ticker-paused');
    });

    pill.addEventListener('mouseleave', () => {
      track.classList.remove('ticker-paused');
    });
  });

  // Listen to agent events to dynamically add or update pills
  bus.on('registry:agent_registered', (agentSpec) => {
    // Dynamically refresh ticker when an external agent registers
    renderTickerPills(track);
  });
}

function renderTickerPills(track) {
  const registeredAgents = registry.listAgents();
  const list = [...DEFAULT_ACTIVE_ENTITIES];

  // Append any dynamically registered agents from registry
  registeredAgents.forEach(ag => {
    if (!list.some(item => item.id === ag.id)) {
      list.push({
        id: ag.id,
        name: ag.name.toUpperCase(),
        type: 'AGENT',
        status: 'ACTIVE',
        icon: '⚙',
        badge: 'ACTIVE',
        badgeType: 'positive',
        sub: ag.role || 'Autonomous Capability',
        stats: {
          capabilities: (ag.capabilities || []).join(', ') || 'General Agent',
          status: 'Online'
        }
      });
    }
  });

  // Create two duplicate sets to produce a perfectly seamless endless marquee loop
  const htmlSet = list.map(item => createPillHtml(item)).join('');
  track.innerHTML = htmlSet + htmlSet;
}

function createPillHtml(item) {
  let badgeClass = 'retro-badge-positive';
  if (item.badgeType === 'cyan') badgeClass = 'retro-badge-cyan';
  else if (item.badgeType === 'accent') badgeClass = 'retro-badge-accent';

  // Format stats lines for Papertrade popup preview card
  let statsRows = '';
  if (item.stats) {
    statsRows = Object.entries(item.stats).map(([k, v]) => `
      <div class="flex justify-between items-center text-[9px] gap-2 py-0.5">
        <span class="text-[var(--pt-ink-muted)] uppercase">${escapeAttr(k)}:</span>
        <span class="font-bold text-[var(--pt-ink)] truncate max-w-[170px]">${escapeAttr(v)}</span>
      </div>
    `).join('');
  }

  return `
    <div class="agent-pill group" data-agent-id="${escapeAttr(item.id)}">
      <div class="agent-pill-inner">
        <span class="agent-pill-icon">${item.icon}</span>
        <span class="agent-pill-title">${escapeAttr(item.name)}</span>
        <span class="retro-badge ${badgeClass} text-[8px] py-0 px-1 font-mono">${escapeAttr(item.badge)}</span>
      </div>

      <!-- Papertrade Hover Detail Popover Card -->
      <div class="agent-pill-popover">
        <div class="flex items-center justify-between pb-1 mb-1.5 border-b border-[var(--pt-border)] text-[10px]">
          <span class="font-bold text-[var(--pt-ink)] flex items-center gap-1.5">
            <span>${item.icon}</span>
            <span>${escapeAttr(item.name)}</span>
          </span>
          <span class="retro-badge ${badgeClass} text-[8px] py-0 px-1">${escapeAttr(item.type)}</span>
        </div>
        <p class="text-[10px] text-[var(--pt-ink-muted)] mb-2 leading-tight">${escapeAttr(item.sub)}</p>
        <div class="bg-[var(--pt-panel-sunken)] p-1.5 rounded-[var(--pt-radius-xs)] border border-[var(--pt-border)] space-y-0.5 mb-1.5">
          ${statsRows}
        </div>
        <div class="flex items-center justify-between text-[8px] font-mono text-[var(--pt-ink-faint)] pt-1 border-t border-[var(--pt-border)]">
          <span>STATUS: ${escapeAttr(item.status)}</span>
          <span>AUTONOMOUS // RUNNING</span>
        </div>
      </div>
    </div>
  `;
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
