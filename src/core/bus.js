/**
 * Core Event Bus
 * Lightweight, pub/sub event engine for decoupled inter-module & agent communication.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const list = this.listeners.get(event);
    if (list) {
      list.delete(callback);
      if (list.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, payload) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      });
    }
  }

  once(event, callback) {
    const unbind = this.on(event, (payload) => {
      unbind();
      callback(payload);
    });
    return unbind;
  }
}

export const bus = new EventBus();
