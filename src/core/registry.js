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
    this.cardSlots = new Map();
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
    const action = this.actions.get(actionId);
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
