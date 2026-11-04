/**
 * Architecture & Brainstorming Visual Node Graph (FigJam / Retro Node Canvas)
 * Supports dragging nodes, pan & zoom, connecting wires, and dual modes:
 * Mode A: Code Architecture & Event Bus Map
 * Mode B: Live Workspace Graph (Research -> Projects -> Trades & LP)
 */
import { bus } from '../core/bus.js';
import { store } from '../core/store.js';
import { openModal, closeModal } from '../core/utils.js';
import { openProjectDetailModal } from './project.js';
import { openJournalEntryModal } from './journal.js';

let currentMode = 'architecture'; // 'architecture' | 'workspace'
let scale = 1;
let pan = { x: 40, y: 30 };
let isPanning = false;
let startPan = { x: 0, y: 0 };
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };
let activeNodeId = null;

// Architecture Blueprint Nodes & Edges
const ARCH_NODES = [
  { id: 'bus', title: 'CORE EVENT BUS', sub: 'src/core/bus.js', type: 'core', x: 380, y: 190, color: 'accent' },
  { id: 'store', title: 'REACTIVE STORE', sub: 'src/core/store.js (LocalStorage)', type: 'core', x: 380, y: 50, color: 'positive' },
  { id: 'registry', title: 'ACTION REGISTRY', sub: 'src/core/registry.js (Tool Specs)', type: 'core', x: 380, y: 330, color: 'cyan' },
  { id: 'research', title: 'CARD 1: RESEARCH', sub: 'Dynamic Excel Table & Rows', type: 'ui', x: 70, y: 80, color: 'cyan' },
  { id: 'project', title: 'CARD 2: PROJECT', sub: 'Enrolled Specs & Detail Modal', type: 'ui', x: 70, y: 220, color: 'accent' },
  { id: 'journal', title: 'CARD 3: DEGEN & LP', sub: 'Trade Perps & LP Vaults', type: 'ui', x: 70, y: 360, color: 'positive' },
  { id: 'buffer', title: 'CARD 4: BUFFER', sub: 'Scratchpad Buffer & Notes', type: 'ui', x: 70, y: 500, color: 'ink' },
  { id: 'agents', title: 'AGENT RUNNERS', sub: 'Web3 Journaler & Auditor Stubs', type: 'agent', x: 690, y: 190, color: 'accent' },
  { id: 'web3', title: 'WEB3 ADAPTER', sub: 'EIP-1193 & Contract Bridge', type: 'agent', x: 690, y: 330, color: 'cyan' },
];

const ARCH_LINKS = [
  { from: 'research', to: 'project', label: '[OK] Promote Flow' },
  { from: 'project', to: 'journal', label: 'Strategy Link' },
  { from: 'research', to: 'bus', label: 'research:*' },
  { from: 'project', to: 'bus', label: 'project:*' },
  { from: 'journal', to: 'bus', label: 'journal:*' },
  { from: 'buffer', to: 'store', label: 'auto-save' },
  { from: 'store', to: 'bus', label: 'store:changed' },
  { from: 'agents', to: 'registry', label: 'executeAction' },
  { from: 'agents', to: 'bus', label: 'pub/sub' },
  { from: 'agents', to: 'web3', label: 'RPC / Wallet' },
];

let activeNodes = [];
let activeLinks = [];

export function initVisualArch() {
  const mapBtn = document.getElementById('mapModalBtn');
  if (mapBtn) {
    mapBtn.addEventListener('click', () => {
      openVisualArchModal();
    });
  }

  const modeArchBtn = document.getElementById('graphModeArchBtn');
  const modeDataBtn = document.getElementById('graphModeDataBtn');
  const resetViewBtn = document.getElementById('graphResetViewBtn');

  if (modeArchBtn) {
    modeArchBtn.addEventListener('click', () => {
      currentMode = 'architecture';
      modeArchBtn.classList.add('retro-btn-primary');
      modeDataBtn?.classList.remove('retro-btn-primary');
      buildGraphData();
      renderGraph();
    });
  }

  if (modeDataBtn) {
    modeDataBtn.addEventListener('click', () => {
      currentMode = 'workspace';
      modeDataBtn.classList.add('retro-btn-primary');
      modeArchBtn?.classList.remove('retro-btn-primary');
      buildGraphData();
      renderGraph();
    });
  }

  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => {
      pan = { x: 40, y: 30 };
      scale = 1;
      applyTransform();
    });
  }

  setupCanvasInteractions();
}

export function openVisualArchModal() {
  buildGraphData();
  openModal('archMapModal');
  setTimeout(() => {
    renderGraph();
    applyTransform();
  }, 50);
}

function buildGraphData() {
  if (currentMode === 'architecture') {
    activeNodes = JSON.parse(JSON.stringify(ARCH_NODES));
    activeLinks = JSON.parse(JSON.stringify(ARCH_LINKS));
  } else {
    // Mode B: Generate Live Data Knowledge Graph from Current Workspace
    const nodes = [];
    const links = [];

    const research = store.get('research') || { rows: [] };
    const projects = store.get('projects') || [];
    const journal = store.get('journal') || [];

    // Central workspace hub
    nodes.push({ id: 'hub', title: 'WORKSPACE HUB', sub: 'Brainstorm & Pipeline Root', type: 'core', x: 420, y: 160, color: 'accent' });

    // Research items (left)
    research.rows.slice(0, 5).forEach((r, idx) => {
      const id = `r_${r.id}`;
      nodes.push({
        id,
        title: (r.project || r.source || 'Research Item').slice(0, 22),
        sub: `Source: ${(r.source || 'Table').slice(0, 18)}`,
        type: 'ui',
        x: 60,
        y: 60 + idx * 95,
        color: 'cyan',
        raw: r
      });
      links.push({ from: id, to: 'hub', label: 'research' });
    });

    // Projects (center-right)
    projects.slice(0, 5).forEach((p, idx) => {
      const id = `p_${p.id}`;
      nodes.push({
        id,
        title: p.name.slice(0, 22),
        sub: `Status: ${p.status}`,
        type: 'project_node',
        x: 420,
        y: 300 + idx * 95,
        color: p.status === 'DONE' ? 'positive' : 'accent',
        rawId: p.id
      });
      links.push({ from: 'hub', to: id, label: 'promoted' });
    });

    // Journal trades / LP (far right)
    journal.slice(0, 6).forEach((j, idx) => {
      const id = `j_${j.id}`;
      nodes.push({
        id,
        title: `${j.type}: ${j.pair}`.slice(0, 24),
        sub: `${j.action} • ${j.status}`,
        type: 'journal_node',
        x: 770,
        y: 60 + idx * 95,
        color: j.type === 'LP' ? 'cyan' : 'positive',
        rawId: j.id
      });
      links.push({ from: 'hub', to: id, label: 'strategy' });
    });

    activeNodes = nodes;
    activeLinks = links;
  }
}

function renderGraph() {
  const container = document.getElementById('graphNodesContainer');
  const svg = document.getElementById('graphSvgWires');
  if (!container || !svg) return;

  // Render SVG wires
  let svgHtml = '';
  activeLinks.forEach(link => {
    const source = activeNodes.find(n => n.id === link.from);
    const target = activeNodes.find(n => n.id === link.to);
    if (!source || !target) return;

    const x1 = source.x + 95;
    const y1 = source.y + 34;
    const x2 = target.x + 95;
    const y2 = target.y + 34;
    const mx = (x1 + x2) / 2;

    const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    svgHtml += `
      <path d="${path}" class="graph-wire" />
      ${link.label ? `<text x="${mx}" y="${(y1 + y2) / 2 - 6}" class="graph-wire-label" text-anchor="middle">${link.label}</text>` : ''}
    `;
  });
  svg.innerHTML = svgHtml;

  // Render Node DOM cards
  container.innerHTML = activeNodes.map(node => {
    let badgeClass = 'retro-badge-accent';
    if (node.color === 'positive') badgeClass = 'retro-badge-positive';
    if (node.color === 'cyan') badgeClass = 'retro-badge-cyan';

    const isSelected = activeNodeId === node.id;

    return `
      <div 
        class="graph-node ${isSelected ? 'graph-node-active' : ''}" 
        id="node_${node.id}" 
        data-node-id="${node.id}"
        style="transform: translate(${node.x}px, ${node.y}px);"
      >
        <div class="flex items-center justify-between pb-1 border-b border-[var(--pt-border)] text-[9px]">
          <span class="retro-badge ${badgeClass} py-0 px-1 font-bold">${node.type.toUpperCase()}</span>
          <span class="text-[var(--pt-ink-muted)] text-[8px]">●</span>
        </div>
        <div class="font-bold text-[11px] truncate mt-1 text-[var(--pt-ink)]">${node.title}</div>
        <div class="text-[9px] text-[var(--pt-ink-muted)] truncate">${node.sub}</div>
      </div>
    `;
  }).join('');

  // Node Drag and Click Listeners
  container.querySelectorAll('.graph-node').forEach(el => {
    const id = el.dataset.nodeId;
    const nodeObj = activeNodes.find(n => n.id === id);

    el.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      draggedNode = nodeObj;
      dragOffset = {
        x: (e.clientX - pan.x) / scale - nodeObj.x,
        y: (e.clientY - pan.y) / scale - nodeObj.y,
      };
      activeNodeId = id;
      renderGraph();
    });

    // Double-click to jump to Project Detail or Journal if in Mode B
    el.addEventListener('dblclick', () => {
      if (nodeObj.type === 'project_node' && nodeObj.rawId) {
        closeModal('archMapModal');
        openProjectDetailModal(nodeObj.rawId);
      } else if (nodeObj.type === 'journal_node' && nodeObj.rawId) {
        closeModal('archMapModal');
        openJournalEntryModal(nodeObj.rawId);
      }
    });
  });
}

function setupCanvasInteractions() {
  const canvas = document.getElementById('archCanvasViewport');
  if (!canvas) return;

  // Pan canvas on background drag
  canvas.addEventListener('mousedown', (e) => {
    if (e.target.closest('.graph-node')) return;
    isPanning = true;
    startPan = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  });

  window.addEventListener('mousemove', (e) => {
    if (isPanning) {
      pan.x = e.clientX - startPan.x;
      pan.y = e.clientY - startPan.y;
      applyTransform();
    } else if (draggedNode) {
      draggedNode.x = (e.clientX - pan.x) / scale - dragOffset.x;
      draggedNode.y = (e.clientY - pan.y) / scale - dragOffset.y;
      renderGraph();
    }
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    draggedNode = null;
  });

  // Zoom in / out with mouse wheel
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    scale = Math.min(Math.max(0.4, scale * zoomFactor), 2.2);
    applyTransform();
  });
}

function applyTransform() {
  const world = document.getElementById('graphWorld');
  if (world) {
    world.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
  }
}
