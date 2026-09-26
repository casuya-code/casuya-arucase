/**
 * Comprehensive Data Persistence Manager
 * Implements multiple layers of data protection to prevent data loss
 */

/** Flatten legacy double-wrapped { scores: { scores: map } } payloads */
export function normalizeScoresMap(scores) {
  if (scores == null || typeof scores !== 'object' || Array.isArray(scores)) {
    return {};
  }
  if (
    scores.scores != null &&
    typeof scores.scores === 'object' &&
    !Array.isArray(scores.scores) &&
    !('score' in scores)
  ) {
    return normalizeScoresMap(scores.scores);
  }
  return scores;
}

/**
 * Persistence scope key. Subject ids are global across cohorts, so the year has
 * to be part of the key: without it a half-entered 2026 sheet would be restored
 * on top of the 2025 sheet for the same subject.
 */
export function buildScopeKey(subjectId, scoreType, year) {
  const subject = String(subjectId ?? 'unknown');
  const type = String(scoreType ?? 'unknown');
  const cohort = year === undefined || year === null || year === '' ? 'noyear' : String(year);
  return `${cohort}_${subject}_${type}`;
}

/** Coerce a stored scope back into its parts (keys are cohort_subject_type). */
export function parseScopeKey(key) {
  if (typeof key !== 'string') return null;
  const parts = key.split('_');
  if (parts.length < 3) return null;
  return {
    year: parts[0] === 'noyear' ? null : parts[0],
    subjectId: parts.slice(1, -1).join('_'),
    scoreType: parts[parts.length - 1],
  };
}

export class DataPersistenceManager {
  constructor() {
    this.storageKeys = {
      localStorage: 'preformone_scores_',
      sessionStorage: 'preformone_scores_session_',
      indexedDB: 'preformone_scores_db'
    };
    this.autoSaveInterval = 30000; // 30 seconds
    this.autoSaveTimer = null;
    this.isOnline = navigator.onLine;
    this.pendingSaves = new Map();
    
    // Initialize event listeners
    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners for data protection
   */
  initializeEventListeners() {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveAllData();
      }
    });

    // Page unload
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedData()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
      this.saveAllData();
    });

    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Storage events (cross-tab synchronization)
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith(this.storageKeys.localStorage)) {
        this.handleStorageChange(e);
      }
    });
  }

  /**
   * Save data to multiple storage layers
   */
  async saveData(subjectId, scoreType, scores, { year } = {}) {
    const timestamp = Date.now();
    const data = {
      scores: normalizeScoresMap(scores),
      timestamp,
      version: '2.0',
      scope: { subjectId, scoreType, year: year ?? null },
    };

    try {
      // Layer 1: localStorage (persistent)
      this.saveToLocalStorage(subjectId, scoreType, data, year);
      
      // Layer 2: sessionStorage (session backup)
      this.saveToSessionStorage(subjectId, scoreType, data, year);
      
      // Layer 3: IndexedDB (large data backup)
      await this.saveToIndexedDB(subjectId, scoreType, data, year);
      
      // Layer 4: Memory (immediate access)
      this.saveToMemory(subjectId, scoreType, data, year);
      
      // Layer 5: Server (if online)
      if (this.isOnline) {
        this.saveToServer(subjectId, scoreType, data, year);
      } else {
        this.queueForServerSync(subjectId, scoreType, data, year);
      }
      
      return true;
    } catch (error) {
      console.error('❌ DATA PERSISTENCE: Error saving data:', error);
      console.error('🔒 PERSISTENCE DEBUG: Save error details:', {
        subjectId,
        scoreType,
        year,
        scoresCount: Object.keys(scores || {}).length,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return false;
    }
  }

  /**
   * Load data from multiple storage layers with fallback.
   * Restores only data written for the same year/subject/type scope.
   */
  async loadData(subjectId, scoreType, { year } = {}) {
    try {
      // Layer 1: Memory (fastest)
      const memoryData = this.loadFromMemory(subjectId, scoreType, year);
      if (memoryData && this.isValidData(memoryData)) {
        return normalizeScoresMap(memoryData.scores);
      }

      // Layer 2: localStorage (persistent)
      const localData = this.loadFromLocalStorage(subjectId, scoreType, year);
      if (localData && this.isValidData(localData)) {
        this.saveToMemory(subjectId, scoreType, localData, year);
        return normalizeScoresMap(localData.scores);
      }

      // Layer 3: sessionStorage (session backup)
      const sessionData = this.loadFromSessionStorage(subjectId, scoreType, year);
      if (sessionData && this.isValidData(sessionData)) {
        this.saveToMemory(subjectId, scoreType, sessionData, year);
        return normalizeScoresMap(sessionData.scores);
      }

      // Layer 4: IndexedDB (large data)
      const indexedData = await this.loadFromIndexedDB(subjectId, scoreType, year);
      if (indexedData && this.isValidData(indexedData)) {
        this.saveToMemory(subjectId, scoreType, indexedData, year);
        return normalizeScoresMap(indexedData.scores);
      }

      // Layer 5: Server (if online)
      if (this.isOnline) {
        try {
          const serverData = await this.loadFromServer(subjectId, scoreType, year);
          if (serverData && this.isValidData(serverData)) {
            this.saveToMemory(subjectId, scoreType, serverData, year);
            return normalizeScoresMap(serverData.scores);
          }
        } catch (error) {
          console.error('❌ DATA PERSISTENCE: Error loading from server:', error);
        }
      }

      return {};
    } catch (error) {
      console.error('❌ DATA PERSISTENCE: Error loading data:', error);
      console.error('🔒 PERSISTENCE DEBUG: Load error details:', {
        subjectId,
        scoreType,
        year,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return {};
    }
  }

  /**
   * localStorage operations
   */
  saveToLocalStorage(subjectId, scoreType, data, year) {
    try {
      const key = this.storageKeys.localStorage + buildScopeKey(subjectId, scoreType, year);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('❌ LocalStorage save error:', error);
    }
  }

  loadFromLocalStorage(subjectId, scoreType, year) {
    try {
      const key = this.storageKeys.localStorage + buildScopeKey(subjectId, scoreType, year);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ LocalStorage load error:', error);
      return null;
    }
  }

  /**
   * sessionStorage operations
   */
  saveToSessionStorage(subjectId, scoreType, data, year) {
    try {
      const key = this.storageKeys.sessionStorage + buildScopeKey(subjectId, scoreType, year);
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('❌ SessionStorage save error:', error);
    }
  }

  loadFromSessionStorage(subjectId, scoreType, year) {
    try {
      const key = this.storageKeys.sessionStorage + buildScopeKey(subjectId, scoreType, year);
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ SessionStorage load error:', error);
      return null;
    }
  }

  /**
   * IndexedDB operations
   */
  async saveToIndexedDB(subjectId, scoreType, data, year) {
    try {
      const db = await this.getIndexedDB();
      if (!db) {
        return false;
      }
      
      const transaction = db.transaction(['scores'], 'readwrite');
      const store = transaction.objectStore('scores');
      const key = buildScopeKey(subjectId, scoreType, year);
      
      await store.put({ key, data, timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error('❌ IndexedDB save error:', error);
      return false;
    }
  }

  async loadFromIndexedDB(subjectId, scoreType, year) {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['scores'], 'readonly');
      const store = transaction.objectStore('scores');
      const key = buildScopeKey(subjectId, scoreType, year);
      
      const result = await store.get(key);
      return result ? result.data : null;
    } catch (error) {
      console.error('❌ IndexedDB load error:', error);
      return null;
    }
  }

  async getIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.storageKeys.indexedDB, 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains('scores')) {
          db.deleteObjectStore('scores');
        }
        db.createObjectStore('scores', { keyPath: 'key' });
      };
    });
  }

  /**
   * Memory storage operations
   */
  saveToMemory(subjectId, scoreType, data, year) {
    const key = buildScopeKey(subjectId, scoreType, year);
    this.memoryStore = this.memoryStore || new Map();
    this.memoryStore.set(key, data);
  }

  loadFromMemory(subjectId, scoreType, year) {
    const key = buildScopeKey(subjectId, scoreType, year);
    this.memoryStore = this.memoryStore || new Map();
    return this.memoryStore.get(key) || null;
  }

  /**
   * Server operations
   */
  async saveToServer(_subjectId, _scoreType, _data, _year) {
    return true;
  }

  async loadFromServer(_subjectId, _scoreType, _year) {
    return null;
  }

  /**
   * Offline queue. Entries are keyed by the same cohort_subject_type scope as
   * every other layer, so a reconnect can never replay one cohort's sheet into
   * another cohort's scope.
   */
  queueForServerSync(subjectId, scoreType, data, year) {
    const key = buildScopeKey(subjectId, scoreType, year);
    this.pendingSaves.set(key, { subjectId, scoreType, year, data });
  }

  async syncPendingData() {
    if (!this.pendingSaves || this.pendingSaves.size === 0) return;

    for (const [key, entry] of [...this.pendingSaves.entries()]) {
      const scope = parseScopeKey(key);
      if (!scope) {
        this.pendingSaves.delete(key);
        continue;
      }
      try {
        const saved = await this.saveToServer(scope.subjectId, scope.scoreType, entry.data, scope.year);
        if (saved) {
          this.pendingSaves.delete(key);
        }
      } catch (error) {
        console.error('❌ DATA PERSISTENCE: Error syncing pending data:', error);
      }
    }
  }

  hasPendingSaves() {
    return this.pendingSaves && this.pendingSaves.size > 0;
  }

  /**
   * Auto-save functionality
   */
  startAutoSave(subjectId, scoreType, saveCallback) {
    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(() => {
      if (this.hasUnsavedData()) {
        saveCallback();
      }
    }, this.autoSaveInterval);
  }

  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Data validation and cleanup
   */
  isValidData(data) {
    return data &&
           data.scores != null &&
           typeof data.scores === 'object' &&
           !Array.isArray(data.scores) &&
           data.timestamp &&
           !this.isDataExpired(data.timestamp);
  }

  isDataExpired(timestamp) {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return (Date.now() - timestamp) > maxAge;
  }

  /**
   * Utility methods
   */
  getStorageKey(subjectId, scoreType, year) {
    return buildScopeKey(subjectId, scoreType, year);
  }

  hasUnsavedData() {
    // Check if there's any unsaved data in memory
    return this.memoryStore && this.memoryStore.size > 0;
  }

  saveAllData() {
    // Save all data in memory to persistent storage, preserving each entry's scope
    if (this.memoryStore) {
      this.memoryStore.forEach((data, key) => {
        const scope = parseScopeKey(key);
        if (!scope) return;
        this.saveToLocalStorage(scope.subjectId, scope.scoreType, data, scope.year);
        this.saveToSessionStorage(scope.subjectId, scope.scoreType, data, scope.year);
      });
    }
  }

  clearData(subjectId, scoreType, { year } = {}) {
    const key = buildScopeKey(subjectId, scoreType, year);
    
    // Clear all storage layers
    localStorage.removeItem(this.storageKeys.localStorage + key);
    sessionStorage.removeItem(this.storageKeys.sessionStorage + key);
    
    // Clear memory
    if (this.memoryStore) {
      this.memoryStore.delete(key);
    }
    
    // Clear IndexedDB
    this.clearIndexedDB(key);
    
  }

  async clearIndexedDB(key) {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['scores'], 'readwrite');
      const store = transaction.objectStore('scores');
      await store.delete(key);
    } catch (error) {
      console.error('❌ IndexedDB clear error:', error);
    }
  }

  handleStorageChange(event) {
    // Handle cross-tab synchronization
    if (event.key?.startsWith(this.storageKeys.localStorage)) {
      // Reload data from localStorage
      window.location.reload();
    }
  }

  /**
   * Data recovery methods
   */
  async recoverData() {
    console.log('🔒 DATA PERSISTENCE: Attempting data recovery...');
    
    const recoveredData = new Map();
    
    // Try to recover from all storage layers
    const storageKeys = Object.keys(localStorage);
    const scoreKeys = storageKeys.filter(key => key.startsWith(this.storageKeys.localStorage));
    
    for (const key of scoreKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (this.isValidData(data)) {
          recoveredData.set(key, data);
        }
      } catch (error) {
        console.error('❌ Recovery error for key:', key, error);
      }
    }
    
    console.log('🔒 DATA PERSISTENCE: Recovered', recoveredData.size, 'data sets');
    return recoveredData;
  }
}

// Create singleton instance
const dataPersistenceManager = new DataPersistenceManager();

export default dataPersistenceManager;
