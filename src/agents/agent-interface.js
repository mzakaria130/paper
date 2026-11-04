/**
 * Base Agent Interface
 * Any agent (Smart Contract Auditor, Strategy Journaler, Code Generator, Dev Planner)
 * inherits from this base class or satisfies its contract.
 */
import { bus } from '../core/bus.js';
import { registry } from '../core/registry.js';

export class BaseAgent {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique ID (e.g., "agent.security_auditor")
   * @param {string} options.name - Display title
   * @param {string} options.role - Brief role description
   * @param {string[]} [options.capabilities] - List of registered actions it supports
   */
  constructor({ id, name, role, capabilities = [] }) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.capabilities = capabilities;
    this.bus = bus;
    this.registry = registry;
  }

  /**
   * Lifecycle hook called on dashboard initialization
   */
  init() {
    console.log(`[BaseAgent] Initializing ${this.name} (${this.id})`);
    this.setupListeners();
  }

  /**
   * Override to bind event listeners
   */
  setupListeners() {}

  /**
   * Dispatch an intent / execute an action
   */
  async runAction(actionId, params = {}) {
    return this.registry.executeAction(actionId, {
      agentId: this.id,
      ...params
    });
  }

  log(message, data = null) {
    const entry = { timestamp: new Date().toISOString(), agentId: this.id, message, data };
    this.bus.emit('agent:log', entry);
    console.log(`[${this.name}]`, message, data || '');
  }
}
