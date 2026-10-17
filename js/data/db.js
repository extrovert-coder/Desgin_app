/**
 * IndexedDB Connection and Schema Migration Manager
 * Demonstrates: Abstraction, Information Hiding, High Cohesion, and Modularity
 */

import { DB_NAME, DB_VERSION, SCHEMA_DEFINITIONS } from './stores.js';

// Private module-scoped singleton connection
let dbInstance = null;
let connectionPromise = null;

/**
 * Open and return the shared IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
export function getDatabaseConnection() {
  // If an active, open connection already exists, return it
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  // If a connection attempt is currently in flight, return existing promise
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      const error = new Error('IndexedDB is not supported in this browser environment.');
      connectionPromise = null;
      return reject(error);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Handle database schema initialization and forward migrations safely
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const transaction = request.transaction;

      for (const [storeName, def] of Object.entries(SCHEMA_DEFINITIONS)) {
        let store;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(storeName)) {
          store = db.createObjectStore(storeName, {
            keyPath: def.keyPath,
            autoIncrement: def.autoIncrement || false
          });
        } else {
          store = transaction.objectStore(storeName);
        }

        // Add indexes if missing (non-destructive)
        if (def.indexes && Array.isArray(def.indexes)) {
          for (const index of def.indexes) {
            if (!store.indexNames.contains(index.name)) {
              store.createIndex(index.name, index.keyPath, index.options);
            }
          }
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      connectionPromise = null;

      // Handle external version changes (e.g., if multiple tabs update version)
      dbInstance.onversionchange = () => {
        console.warn('[IndexedDB] Connection closing due to schema upgrade in another process.');
        closeDatabaseConnection();
      };

      // Reset pointer if database closes unexpectedly
      dbInstance.onclose = () => {
        dbInstance = null;
      };

      dbInstance.onerror = (event) => {
        console.error('[IndexedDB] Unhandled database error:', event.target?.error || event);
      };

      resolve(dbInstance);
    };

    request.onerror = () => {
      connectionPromise = null;
      const error = request.error || new Error('Failed to open database');
      console.error('[IndexedDB] Open request failed:', error);
      reject(error);
    };

    request.onblocked = (event) => {
      console.warn('[IndexedDB] Database open request is blocked. Please close other open tabs.', event);
    };
  });

  return connectionPromise;
}

/**
 * Gracefully close the database connection
 */
export function closeDatabaseConnection() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.warn('[IndexedDB] Error during connection close:', e);
    }
    dbInstance = null;
  }
  connectionPromise = null;
}

/**
 * Delete the entire database (Used for data resets and complete purges)
 * @returns {Promise<void>}
 */
export function deleteDatabase() {
  closeDatabaseConnection();

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      console.log(`[IndexedDB] Database "${DB_NAME}" deleted successfully.`);
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to delete database'));
    };

    request.onblocked = () => {
      console.warn(`[IndexedDB] Deletion of "${DB_NAME}" blocked. Please close all tabs.`);
    };
  });
}
