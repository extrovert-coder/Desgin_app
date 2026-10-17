/**
 * Generic Asynchronous Repository for IndexedDB
 * Demonstrates: Abstraction, Information Hiding, Separation of Concerns, Reusability
 */

import { getDatabaseConnection } from './db.js';
import { STORES, generateId, getTimestamp } from './stores.js';

/**
 * Generic Repository class encapsulating all low-level IndexedDB transactions
 * for an object store.
 */
export class Repository {
  #storeName;

  /**
   * @param {string} storeName - Must match one of STORES values
   */
  constructor(storeName) {
    if (!storeName || typeof storeName !== 'string') {
      throw new Error(`Repository constructor requires a valid storeName string, received "${storeName}"`);
    }
    this.#storeName = storeName;
  }

  /**
   * Return the store name (read-only)
   * @returns {string}
   */
  get storeName() {
    return this.#storeName;
  }

  /**
   * Internal helper to execute an operation inside a managed transaction
   * @private
   * @param {'readonly'|'readwrite'} mode
   * @param {Function} operation - (objectStore, transaction) => IDBRequest
   * @returns {Promise<*>}
   */
  async #execute(mode, operation) {
    const db = await getDatabaseConnection();

    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction([this.#storeName], mode);
      } catch (err) {
        return reject(new Error(`Failed to initialize transaction on store "${this.#storeName}": ${err.message}`));
      }

      const store = tx.objectStore(this.#storeName);
      let request;

      try {
        request = operation(store, tx);
      } catch (err) {
        return reject(new Error(`Operation execution failed on store "${this.#storeName}": ${err.message}`));
      }

      tx.onerror = () => {
        const error = tx.error || (request && request.error) || new Error('Transaction failed');
        reject(error);
      };

      tx.onabort = () => {
        const error = tx.error || new Error(`Transaction on store "${this.#storeName}" was aborted`);
        reject(error);
      };

      if (request) {
        request.onsuccess = () => {
          resolve(request.result !== undefined ? request.result : null);
        };

        request.onerror = (e) => {
          // Prevent standard abort bubbling if handled, but let error propagate
          reject(request.error || new Error('Request failed'));
        };
      } else {
        tx.oncomplete = () => resolve(null);
      }
    });
  }

  /**
   * Add a new entity to the store.
   * Auto-generates an ID if not supplied, along with createdAt/updatedAt timestamps.
   * @param {Object} entity
   * @returns {Promise<Object>} The persisted entity
   */
  async add(entity) {
    if (!entity || typeof entity !== 'object') {
      throw new TypeError(`Cannot add non-object entity to store "${this.#storeName}"`);
    }

    const record = {
      ...entity,
      id: entity.id || generateId(),
      createdAt: entity.createdAt || getTimestamp(),
      updatedAt: entity.updatedAt || getTimestamp()
    };

    await this.#execute('readwrite', (store) => store.add(record));
    return record;
  }

  /**
   * Retrieve an entity by its primary key ID
   * @param {string|number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    if (id === null || id === undefined || id === '') {
      throw new Error(`getById requires a valid key ID, received "${id}"`);
    }

    const result = await this.#execute('readonly', (store) => store.get(id));
    return result || null;
  }

  /**
   * Retrieve all entities stored in this repository
   * @returns {Promise<Array<Object>>}
   */
  async getAll() {
    const results = await this.#execute('readonly', (store) => store.getAll());
    return Array.isArray(results) ? results : [];
  }

  /**
   * Update an existing entity
   * Automatically refreshes updatedAt timestamp.
   * @param {Object} entity - Must have an `id` field
   * @returns {Promise<Object>} The updated entity
   */
  async update(entity) {
    if (!entity || typeof entity !== 'object' || !entity.id) {
      throw new Error(`update operation requires an entity with a valid "id" property`);
    }

    const existing = await this.getById(entity.id);
    if (!existing) {
      throw new Error(`Cannot update: Record with id "${entity.id}" does not exist in store "${this.#storeName}"`);
    }

    const updatedRecord = {
      ...existing,
      ...entity,
      id: existing.id, // Preserve immutable primary key
      createdAt: existing.createdAt || entity.createdAt || getTimestamp(),
      updatedAt: getTimestamp()
    };

    await this.#execute('readwrite', (store) => store.put(updatedRecord));
    return updatedRecord;
  }

  /**
   * Delete an entity by its primary key ID
   * @param {string|number} id
   * @returns {Promise<boolean>} True if delete request was submitted
   */
  async delete(id) {
    if (id === null || id === undefined || id === '') {
      throw new Error(`delete requires a valid key ID, received "${id}"`);
    }

    await this.#execute('readwrite', (store) => store.delete(id));
    return true;
  }

  /**
   * Count the total number of records in this store
   * @returns {Promise<number>}
   */
  async count() {
    const result = await this.#execute('readonly', (store) => store.count());
    return typeof result === 'number' ? result : 0;
  }

  /**
   * Query records matching an index
   * @param {string} indexName
   * @param {IDBKeyRange|any} queryKey
   * @returns {Promise<Array<Object>>}
   */
  async queryByIndex(indexName, queryKey) {
    const db = await getDatabaseConnection();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.#storeName], 'readonly');
      const store = tx.objectStore(this.#storeName);

      if (!store.indexNames.contains(indexName)) {
        return reject(new Error(`Index "${indexName}" does not exist on store "${this.#storeName}"`));
      }

      const index = store.index(indexName);
      const request = index.getAll(queryKey);

      request.onsuccess = () => {
        resolve(Array.isArray(request.result) ? request.result : []);
      };

      request.onerror = () => {
        reject(request.error || new Error(`Index query failed on "${indexName}"`));
      };
    });
  }

  /**
   * Clear all records in this store
   * @returns {Promise<void>}
   */
  async clear() {
    await this.#execute('readwrite', (store) => store.clear());
  }
}

/**
 * Factory helper to instantiate a typed repository
 * @param {string} storeName
 * @returns {Repository}
 */
export function createRepository(storeName) {
  return new Repository(storeName);
}

// Pre-instantiated repositories for each application entity
export const notesRepository = createRepository(STORES.NOTES);
export const tasksRepository = createRepository(STORES.TASKS);
export const quizRepository = createRepository(STORES.QUIZ_RESULTS);
export const plannerRepository = createRepository(STORES.PLANNER);
