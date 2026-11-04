#!/usr/bin/env node
/**
 * PAPER // Agent Bridge — CLI + MCP (stdio) over the /api/state endpoint.
 * Zero dependencies. Requires: node server.js running (default :8080).
 *
 * CLI:
 *   node tools/paper-bridge.mjs status
 *   node tools/paper-bridge.mjs get
 *   node tools/paper-bridge.mjs add-research --source "Cupang Ventures / X" --project "Feed The Fire" --link "https://feedfirereh.com/"
 *   node tools/paper-bridge.mjs add-project --name "Feed The Fire" --source "Cupang Ventures / X" --link "https://feedfirereh.com/" --status ACTIVE --detail-file ./detail.txt
 *   node tools/paper-bridge.mjs add-journal --date 2026-11-04 --type TRADE --pair "HYPE / USD" --action "LONG 20x" --size '$2,000' --range "Entry: $42.50" --pnl "+$100" --status CLOSED --notes "thesis"
 *   node tools/paper-bridge.mjs set-notes --text-file ./notes.txt
 *   node tools/paper-bridge.mjs export [--out paper-data.json]
 *   node tools/paper-bridge.mjs import --in ./backup.json
 *
 * MCP (stdio JSON-RPC):
 *   node tools/paper-bridge.mjs mcp
 * Tools: paper_status, paper_get_state, paper_add_research,
 *        paper_add_project, paper_add_journal, paper_set_notes
 *
 * Env: PAPER_API=http://127.0.0.1:8080
 */
import fs from 'node:fs';
import readline from 'node:readline';

const BASE = (process.env.PAPER_API || 'http://127.0.0.1:8080').replace(/\/$/, '');
const slug = (s) => String(s || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'item';
const uid = (p, s) => `${p}_${slug(s)}_${Date.now().toString(36)}`;

async function apiGet() {
  const r = await fetch(`${BASE}/api/state`);
  if (!r.ok) throw new Error(`GET /api/state -> ${r.status}`);
  return r.json();
}
async function apiPost(state) {
  const r = await fetch(`${BASE}/api/state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`POST /api/state -> ${r.status} ${JSON.stringify(data)}`);
  return data;
}
function ensureShape(s) {
  if (!s || s.initialized) throw new Error('state not initialized — paper-data.json missing; start server once or import a backup first');
  s.version = 3;
  s.theme = s.theme || 'light';
  s.asciiEnabled = s.asciiEnabled !== false;
  s.research = s.research && Array.isArray(s.research.columns) ? s.research : { columns: [{ id: 'source', name: 'SOURCE' }, { id: 'project', name: 'PROJECT' }, { id: 'link', name: 'LINK' }], rows: [] };
  s.projects = Array.isArray(s.projects) ? s.projects : [];
  s.journal = Array.isArray(s.journal) ? s.journal : [];
  s.notes = typeof s.notes === 'string' ? s.notes : '';
  return s;
}
async function mutate(fn) {
  const state = ensureShape(await apiGet());
  const result = fn(state);
  const saved = await apiPost(state);
  return { result, saved };
}

const Ops = {
  status: async () => {
    const s = await apiGet();
    if (s.initialized) return { initialized: false };
    return { initialized: true, timestamp: s.timestamp, counts: { research: s.research.rows.length, projects: s.projects.length, journal: s.journal.length }, projects: s.projects.map((p) => p.name) };
  },
  get_state: async () => ensureShape(await apiGet()),
  add_research: async ({ source, project, link }) => {
    if (!project) throw new Error('project is required');
    return mutate((s) => {
      const dupe = s.research.rows.find((r) => String(r.project).toLowerCase() === String(project).toLowerCase() && String(r.link || '') === String(link || ''));
      if (dupe) return { added: false, id: dupe.id, reason: 'duplicate project+link' };
      const row = { id: uid('row', project), source: source || '', project, link: link || '' };
      s.research.rows.push(row);
      return { added: true, id: row.id };
    });
  },
  add_project: async ({ name, source, link, status, detail }) => {
    if (!name) throw new Error('name is required');
    return mutate((s) => {
      const dupe = s.projects.find((p) => String(p.name).toLowerCase() === String(name).toLowerCase());
      if (dupe) return { added: false, id: dupe.id, reason: 'duplicate name' };
      const proj = { id: uid('proj', name), name, source: source || '', link: link || '', status: status || 'ACTIVE', detail: detail || '', createdAt: Date.now() };
      s.projects.push(proj);
      return { added: true, id: proj.id };
    });
  },
  add_journal: async (e) => {
    if (!e.pair || !e.action) throw new Error('pair and action are required');
    return mutate((s) => {
      const dupe = s.journal.find((j) => j.date === (e.date || '') && String(j.pair).toLowerCase() === String(e.pair).toLowerCase() && String(j.action).toLowerCase() === String(e.action).toLowerCase());
      if (dupe) return { added: false, id: dupe.id, reason: 'duplicate date+pair+action' };
      const entry = { id: uid('jn', e.pair), date: e.date || new Date().toISOString().slice(0, 10), type: e.type || 'TRADE', pair: e.pair, action: e.action, size: e.size || '', range: e.range || '', pnl: e.pnl || '', status: e.status || 'OPEN', notes: e.notes || '' };
      s.journal.push(entry);
      return { added: true, id: entry.id };
    });
  },
  set_notes: async ({ text }) => {
    if (typeof text !== 'string') throw new Error('text is required');
    return mutate((s) => { s.notes = text; return { added: true, chars: text.length }; });
  },
  import_state: async ({ state }) => {
    ensureShape(state);
    const saved = await apiPost(state);
    return { added: true, saved };
  },
};

// ---------- CLI ----------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { out[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; }
  }
  return out;
}
async function runCli() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const need = (k) => { if (!args[k]) throw new Error(`--${k} is required`); return args[k]; };
  const fromFile = (p) => fs.readFileSync(p, 'utf8');
  let out;
  switch (cmd) {
    case 'status': out = await Ops.status(); break;
    case 'get': out = await Ops.get_state(); break;
    case 'add-research': out = await Ops.add_research({ source: args.source, project: need('project'), link: args.link }); break;
    case 'add-project': out = await Ops.add_project({ name: need('name'), source: args.source, link: args.link, status: args.status, detail: args['detail-file'] ? fromFile(args['detail-file']) : args.detail }); break;
    case 'add-journal': out = await Ops.add_journal({ date: args.date, type: args.type, pair: need('pair'), action: need('action'), size: args.size, range: args.range, pnl: args.pnl, status: args.status, notes: args.notes }); break;
    case 'set-notes': out = await Ops.set_notes({ text: args['text-file'] ? fromFile(args['text-file']) : need('text') }); break;
    case 'export': { const s = await Ops.get_state(); if (args.out) fs.writeFileSync(args.out, JSON.stringify(s, null, 2)); out = { exported: true, to: args.out || 'stdout', counts: { research: s.research.rows.length, projects: s.projects.length, journal: s.journal.length } }; if (!args.out) console.log(JSON.stringify(s, null, 2)); break; }
    case 'import': out = await Ops.import_state({ state: JSON.parse(fromFile(need('in'))) }); break;
    default:
      console.error('Usage: status | get | add-research | add-project | add-journal | set-notes | export | import | mcp');
      process.exit(2);
  }
  if (cmd !== 'export' || args.out) console.log(JSON.stringify(out, null, 2));
}

// ---------- MCP (stdio JSON-RPC) ----------
const TOOLS = [
  { name: 'paper_status', description: 'PAPER dashboard health + row/project/journal counts', inputSchema: { type: 'object', properties: {} } },
  { name: 'paper_get_state', description: 'Full PAPER workspace state (research, projects, journal, notes)', inputSchema: { type: 'object', properties: {} } },
  { name: 'paper_add_research', description: 'Add a research row (dedupes on project+link)', inputSchema: { type: 'object', properties: { source: { type: 'string' }, project: { type: 'string' }, link: { type: 'string' } }, required: ['project'] } },
  { name: 'paper_add_project', description: 'Add/enroll a project (dedupes on name)', inputSchema: { type: 'object', properties: { name: { type: 'string' }, source: { type: 'string' }, link: { type: 'string' }, status: { type: 'string' }, detail: { type: 'string' } }, required: ['name'] } },
  { name: 'paper_add_journal', description: 'Log a degen trade/LP journal entry (dedupes on date+pair+action)', inputSchema: { type: 'object', properties: { date: { type: 'string' }, type: { type: 'string' }, pair: { type: 'string' }, action: { type: 'string' }, size: { type: 'string' }, range: { type: 'string' }, pnl: { type: 'string' }, status: { type: 'string' }, notes: { type: 'string' } }, required: ['pair', 'action'] } },
  { name: 'paper_set_notes', description: 'Replace the scratchpad notes text', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
];
function runMcp() {
  const rl = readline.createInterface({ input: process.stdin });
  const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');
  rl.on('line', async (line) => {
    if (!line.trim()) return;
    let msg; try { msg = JSON.parse(line); } catch { return; }
    const { id, method, params } = msg;
    try {
      if (method === 'initialize') {
        send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'paper-bridge', version: '1.0.0' } } });
      } else if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
        // no response
      } else if (method === 'ping') {
        send({ jsonrpc: '2.0', id, result: {} });
      } else if (method === 'tools/list') {
        send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
      } else if (method === 'tools/call') {
        const name = params?.name; const args = params?.arguments || {};
        const map = { paper_status: Ops.status, paper_get_state: Ops.get_state, paper_add_research: Ops.add_research, paper_add_project: Ops.add_project, paper_add_journal: Ops.add_journal, paper_set_notes: Ops.set_notes };
        if (!map[name]) throw new Error(`unknown tool ${name}`);
        const result = await map[name](args);
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
      } else if (id !== undefined) {
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } });
      }
    } catch (e) {
      if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32000, message: String(e.message || e) } });
    }
  });
}

if (process.argv[2] === 'mcp') runMcp();
else runCli().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
