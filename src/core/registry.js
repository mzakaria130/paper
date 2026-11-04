/**
 * Agent & Tool Registry
 * Standardized interface for registering actions, tools, and autonomous agent capabilities.
 * Allows external Web3 libs (ethers/viem/web3.js) or Dev/Audit scripts to plug in seamlessly.
 */
import { bus } from './bus.js';

class Registry {
  constructor() {
    this.actions = new Map();
    this.agents = new Map();
    this.lazyAgents = new Map(); // id -> { create, actions, events, loaded }
    this.cardSlots = new Map();
  }

  /**
   * Register an agent LAZILY (default mode). The factory is NOT called and
   * no actions/listeners are wired until the agent is first needed:
   *  - executeAction(actionId) auto-loads the owning agent, or
   *  - ensureAgent(id) / runAgent(id, actionId, ctx) loads it explicitly.
   * Always-on is opt-in only (see app.js agent mode).
   */
  registerLazyAgent({ id, create, actions = [], events = [] }) {
    if (!id || typeof create !== 'function') throw new Error('[Registry] Lazy agent needs id + create()');
    this.lazyAgents.set(id, { id, create, actions, events, loaded: false, instance: null });
    bus.emit('registry:lazy_agent_registered', { id, actions, events });
    console.log(`[Registry] Lazy Agent registered: ${id} (loads on first use)`);
  }

  /** Instantiate + register a lazy agent on demand. Idempotent. */
  ensureAgent(id) {
    const lazy = this.lazyAgents.get(id);
    if (this.agents.has(id)) return this.agents.get(id);
    if (!lazy) throw new Error(`[Registry] Unknown agent: ${id}`);
    const instance = lazy.create();
    lazy.instance = instance;
    lazy.loaded = true;
    this.registerAgent(instance);
    return instance;
  }

  /** Explicit on-demand run: load agent (if needed) then execute its action. */
  async runAgent(agentId, actionId, context = {}) {
    const agent = this.ensureAgent(agentId);
    if (typeof agent.runAction === 'function') return agent.runAction(actionId, context);
    return this.executeAction(actionId, { agentId, ...context });
  }

  listLazyAgents() {
    return Array.from(this.lazyAgents.values()).map((l) => ({
      id: l.id, actions: l.actions, events: l.events, loaded: l.loaded,
      mode: l.loaded ? 'loaded' : 'lazy',
    }));
  }

  /**
   * Register a capability action (e.g., smart contract mint, trade swap, LP checker, audit scanner)
   * @param {Object} actionSpec 
   * @param {string} actionSpec.id - Unique identifier, e.g. "evm.mint" or "audit.slither"
   * @param {string} actionSpec.name - Display name
   * @param {string} actionSpec.category - Category: 'web3' | 'dev' | 'audit' | 'analytics'
   * @param {Object} [actionSpec.schema] - Optional parameter schema
   * @param {Function} actionSpec.handler - Async execution handler: async (context) => result
   */
  registerAction(actionSpec) {
    if (!actionSpec.id || typeof actionSpec.handler !== 'function') {
      throw new Error(`[Registry] Invalid ActionSpec: must have 'id' and 'handler'`);
    }
    this.actions.set(actionSpec.id, actionSpec);
    bus.emit('registry:action_registered', actionSpec);
    console.log(`[Registry] Registered Action: ${actionSpec.id} [${actionSpec.name || ''}]`);
  }

  getAction(id) {
    return this.actions.get(id);
  }

  listActions(category = null) {
    const all = Array.from(this.actions.values());
    return category ? all.filter(a => a.category === category) : all;
  }

  /**
   * Register an autonomous or interactive Agent
   * @param {Object} agentSpec
   * @param {string} agentSpec.id - e.g. "agent.lp_monitor"
   * @param {string} agentSpec.name - e.g. "Liquidity & Strategy Journaler"
   * @param {string} agentSpec.role - Role summary
   * @param {Function} agentSpec.init - Lifecycle initialization
   */
  registerAgent(agentSpec) {
    if (!agentSpec.id) throw new Error('[Registry] Agent must have an id');
    this.agents.set(agentSpec.id, agentSpec);
    if (typeof agentSpec.init === 'function') {
      agentSpec.init({ bus, registry: this });
    }
    bus.emit('registry:agent_registered', agentSpec);
    console.log(`[Registry] Registered Agent: ${agentSpec.id}`);
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  listAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Execute an action by ID with error boundary & telemetry
   */
  async executeAction(actionId, context = {}) {
    let action = this.actions.get(actionId);
    if (!action) {
      // Lazy path: find the unloaded agent that owns this action and load it.
      for (const lazy of this.lazyAgents.values()) {
        if (!lazy.loaded && lazy.actions.includes(actionId)) {
          this.ensureAgent(lazy.id);
          action = this.actions.get(actionId);
          break;
        }
      }
    }
    if (!action) {
      throw new Error(`[Registry] Action "${actionId}" not found in registry.`);
    }

    bus.emit('agent:action_start', { actionId, context });
    try {
      const result = await action.handler(context);
      bus.emit('agent:action_success', { actionId, result });
      return result;
    } catch (err) {
      console.error(`[Registry] Action execution error on "${actionId}":`, err);
      bus.emit('agent:action_error', { actionId, error: err });
      throw err;
    }
  }
}

export const registry = new Registry();
