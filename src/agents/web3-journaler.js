/**
 * Web3 Strategy & Journaler Agent
 * Lazy by default: instantiated only on first use (see registry lazy agents).
 * - journal.record: REAL (appends to project detail via store)
 * - web3.mint / web3.swap / web3.lp_snapshot: STUBS until wallet adapter
 *   (Phase 6) lands — they return { stub: true } instead of fake success.
 */
import { BaseAgent } from './agent-interface.js';
import { store } from '../core/store.js';

export class Web3JournalerAgent extends BaseAgent {
  constructor() {
    super({
      id: 'agent.web3_journaler',
      name: 'Web3 & Strategy Journaler',
      role: 'Automates contract interactions, LP telemetry, and trade strategy journaling',
      capabilities: ['web3.mint', 'web3.swap', 'web3.lp_snapshot', 'journal.record']
    });
  }

  setupListeners() {
    // Register actions with the global registry
    this.registry.registerAction({
      id: 'web3.swap',
      name: 'Execute Swap (stub — needs wallet adapter)',
      category: 'web3',
      handler: async (ctx) => this.stub('web3.swap', ctx)
    });

    this.registry.registerAction({
      id: 'web3.mint',
      name: 'Execute Mint / Contract Call',
      category: 'web3',
      handler: async (ctx) => this.handleMint(ctx)
    });

    this.registry.registerAction({
      id: 'web3.lp_snapshot',
      name: 'Log LP Position Snapshot',
      category: 'web3',
      handler: async (ctx) => this.handleLPSnapshot(ctx)
    });

    this.registry.registerAction({
      id: 'journal.record',
      name: 'Append Strategy Log to Project',
      category: 'analytics',
      handler: async (ctx) => this.recordStrategyJournal(ctx)
    });

    // Listen to promotions from Research to Project
    this.bus.on('research:promoted', ({ project }) => {
      this.log(`Detected new research item promoted: "${project.name}". Strategy pipeline ready.`);
    });
  }

  stub(actionId, context) {
    return { stub: true, action: actionId, params: context, message: 'Not yet wired — requires the Phase 6 wallet adapter (src/adapters/web3.js). No on-chain action was taken.' };
  }

  async handleMint(context) {
    return this.stub('web3.mint', context);
  }

  async handleLPSnapshot(context) {
    return { ...this.stub('web3.lp_snapshot', context), pool: context.pool || 'BTC/USDC HyperEVM Vault', note: 'No live pool data — connect an RPC/wallet adapter to fetch real telemetry.' };
  }

  async recordStrategyJournal({ projectId, noteContent }) {
    const projects = store.get('projects') || [];
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const addition = `\n\n// STRATEGY JOURNAL LOG [${timestamp}]\n${noteContent}`;
    proj.detail = (proj.detail || '') + addition;
    store.set('projects', projects);
    this.log(`Journal entry appended to project: ${proj.name}`);
    return proj;
  }
}
