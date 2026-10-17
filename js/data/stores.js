/**
 * Data Store Schema Definitions and Constants
 * Demonstrates: High Cohesion, Information Hiding, and Modularity
 * Centralizes all IndexedDB store names and schema index configurations.
 */

export const DB_NAME = 'offline_student_assistant_db';
export const DB_VERSION = 1;

/**
 * Enumeration of all Object Store names in the application.
 * Prevents magic strings across repositories and modules.
 */
export const STORES = Object.freeze({
  NOTES: 'notes',
  TASKS: 'tasks',
  QUIZ_RESULTS: 'quiz_results',
  PLANNER: 'planner'
});

/**
 * Formal schema specifications for stores and their search indexes.
 */
export const SCHEMA_DEFINITIONS = Object.freeze({
  [STORES.NOTES]: {
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'by_category', keyPath: 'category', options: { unique: false } },
      { name: 'by_createdAt', keyPath: 'createdAt', options: { unique: false } },
      { name: 'by_updatedAt', keyPath: 'updatedAt', options: { unique: false } }
    ]
  },
  [STORES.TASKS]: {
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'by_completed', keyPath: 'completed', options: { unique: false } },
      { name: 'by_priority', keyPath: 'priority', options: { unique: false } },
      { name: 'by_dueDate', keyPath: 'dueDate', options: { unique: false } },
      { name: 'by_createdAt', keyPath: 'createdAt', options: { unique: false } }
    ]
  },
  [STORES.QUIZ_RESULTS]: {
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'by_subject', keyPath: 'subject', options: { unique: false } },
      { name: 'by_completedAt', keyPath: 'completedAt', options: { unique: false } }
    ]
  },
  [STORES.PLANNER]: {
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'by_date', keyPath: 'date', options: { unique: false } },
      { name: 'by_createdAt', keyPath: 'createdAt', options: { unique: false } }
    ]
  }
});

/**
 * Generate a cryptographically strong or resilient unique identifier
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Resilient fallback combining timestamp and random entropy
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Generate a standardized ISO timestamp
 * @returns {string}
 */
export function getTimestamp() {
  return new Date().toISOString();
}
