/**
 * Event Bus Module
 * Demonstrates: Low Coupling & Information Hiding
 * Acts as a mediator allowing decoupled modules to communicate via events.
 */

// Private state hidden inside module scope
const listeners = new Map();

/**
 * Subscribe to an event
 * @param {string} event
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribe(event, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError(`EventBus: callback must be a function, received ${typeof callback}`);
  }

  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }

  listeners.get(event).add(callback);

  // Return unsubscribe handle for clean lifecycle management
  return () => unsubscribe(event, callback);
}

/**
 * Unsubscribe a callback from an event
 * @param {string} event
 * @param {Function} callback
 */
export function unsubscribe(event, callback) {
  if (!listeners.has(event)) return;
  const set = listeners.get(event);
  set.delete(callback);
  if (set.size === 0) {
    listeners.delete(event);
  }
}

/**
 * Publish an event to all subscribers
 * @param {string} event
 * @param {*} [data=null]
 */
export function publish(event, data = null) {
  if (!listeners.has(event)) return;
  const set = listeners.get(event);
  for (const callback of set) {
    try {
      callback(data);
    } catch (error) {
      console.error(`[EventBus] Error in subscriber for event "${event}":`, error);
    }
  }
}

/**
 * Clear all listeners (useful for test resets)
 */
export function clearAll() {
  listeners.clear();
}
