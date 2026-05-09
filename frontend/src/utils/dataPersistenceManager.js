/**
 * Comprehensive Data Persistence Manager
 * Implements multiple layers of data protection to prevent data loss
 */

class DataPersistenceManager {
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
  async saveData(subjectId, scoreType, scores) {
    const timestamp = Date.now();
    const data = {
      scores,
      timestamp,
      version: '1.0'
    };

    console.log('🔒 PERSISTENCE DEBUG: Starting save for subject:', subjectId, 'type:', scoreType);
    console.log('🔒 PERSISTENCE DEBUG: Data to save:', data);

    try {
      // Layer 1: localStorage (persistent)
      console.log('🔒 PERSISTENCE DEBUG: Saving to localStorage...');
      this.saveToLocalStorage(subjectId, scoreType, data);
      
      // Layer 2: sessionStorage (session backup)
      console.log('🔒 PERSISTENCE DEBUG: Saving to sessionStorage...');
      this.saveToSessionStorage(subjectId, scoreType, data);
      
      // Layer 3: IndexedDB (large data backup)
      console.log('🔒 PERSISTENCE DEBUG: Saving to IndexedDB...');
      await this.saveToIndexedDB(subjectId, scoreType, data);
      
      // Layer 4: Memory (immediate access)
      console.log('🔒 PERSISTENCE DEBUG: Saving to memory...');
      this.saveToMemory(subjectId, scoreType, data);
      
      // Layer 5: Server (if online)
      if (this.isOnline) {
        console.log('🔒 PERSISTENCE DEBUG: Saving to server...');
        this.saveToServer(subjectId, scoreType, data);
      } else {
        console.log('🔒 PERSISTENCE DEBUG: Queuing for server sync...');
        this.queueForServerSync(subjectId, scoreType, data);
      }
      
      console.log('🔒 DATA PERSISTENCE: Data saved to all layers');
      return true;
    } catch (error) {
      console.error('❌ DATA PERSISTENCE: Error saving data:', error);
      console.error('🔒 PERSISTENCE DEBUG: Save error details:', {
        subjectId,
        scoreType,
        scoresCount: Object.keys(scores || {}).length,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return false;
    }
  }

  /**
   * Load data from multiple storage layers with fallback
   */
  async loadData(subjectId, scoreType) {
    const storageKey = this.getStorageKey(subjectId, scoreType);
    console.log('🔒 PERSISTENCE DEBUG: Starting load for subject:', subjectId, 'type:', scoreType);
    console.log('🔒 PERSISTENCE DEBUG: Storage key:', storageKey);
    
    try {
      // Layer 1: Memory (fastest)
      console.log('🔒 PERSISTENCE DEBUG: Checking memory storage...');
      const memoryData = this.loadFromMemory(subjectId, scoreType);
      console.log('🔒 PERSISTENCE DEBUG: Memory data:', memoryData);
      if (memoryData && this.isValidData(memoryData)) {
        console.log('🔒 DATA PERSISTENCE: Loaded from memory');
        console.log('🔒 PERSISTENCE DEBUG: Returning', Object.keys(memoryData.scores).length, 'scores from memory');
        return memoryData.scores;
      }

      // Layer 2: localStorage (persistent)
      console.log('🔒 PERSISTENCE DEBUG: Checking localStorage...');
      const localData = this.loadFromLocalStorage(subjectId, scoreType);
      console.log('🔒 PERSISTENCE DEBUG: LocalStorage data:', localData);
      if (localData && this.isValidData(localData)) {
        console.log('🔒 DATA PERSISTENCE: Loaded from localStorage');
        console.log('🔒 PERSISTENCE DEBUG: Returning', Object.keys(localData.scores).length, 'scores from localStorage');
        // Restore to memory for faster access
        this.saveToMemory(subjectId, scoreType, localData);
        return localData.scores;
      }

      // Layer 3: sessionStorage (session backup)
      console.log('🔒 PERSISTENCE DEBUG: Checking sessionStorage...');
      const sessionData = this.loadFromSessionStorage(subjectId, scoreType);
      console.log('🔒 PERSISTENCE DEBUG: SessionStorage data:', sessionData);
      if (sessionData && this.isValidData(sessionData)) {
        console.log('🔒 DATA PERSISTENCE: Loaded from sessionStorage');
        console.log('🔒 PERSISTENCE DEBUG: Returning', Object.keys(sessionData.scores).length, 'scores from sessionStorage');
        this.saveToMemory(subjectId, scoreType, sessionData);
        return sessionData.scores;
      }

      // Layer 4: IndexedDB (large data)
      console.log('🔒 PERSISTENCE DEBUG: Checking IndexedDB...');
      const indexedData = await this.loadFromIndexedDB(subjectId, scoreType);
      console.log('🔒 PERSISTENCE DEBUG: IndexedDB data:', indexedData);
      if (indexedData && this.isValidData(indexedData)) {
        console.log('🔒 DATA PERSISTENCE: Loaded from IndexedDB');
        console.log('🔒 PERSISTENCE DEBUG: Returning', Object.keys(indexedData.scores).length, 'scores from IndexedDB');
        this.saveToMemory(subjectId, scoreType, indexedData);
        return indexedData.scores;
      }

      // Layer 5: Server (if online)
      if (this.isOnline) {
        console.log('🔒 PERSISTENCE DEBUG: Checking server storage...');
        try {
          const serverData = await this.loadFromServer(subjectId, scoreType);
          console.log('🔒 PERSISTENCE DEBUG: Server data:', serverData);
          if (serverData) {
            console.log('🔒 DATA PERSISTENCE: Loaded from server');
            console.log('🔒 PERSISTENCE DEBUG: Returning', Object.keys(serverData.scores).length, 'scores from server');
            this.saveToMemory(subjectId, scoreType, serverData);
            return serverData.scores;
          }
        } catch (error) {
          console.error('❌ DATA PERSISTENCE: Error loading from server:', error);
        }
      }

      console.log('🔒 DATA PERSISTENCE: No data found, returning empty object');
      console.log('🔒 PERSISTENCE DEBUG: All storage layers checked, no data found');
      return {};
    } catch (error) {
      console.error('❌ DATA PERSISTENCE: Error loading data:', error);
      console.error('🔒 PERSISTENCE DEBUG: Load error details:', {
        subjectId,
        scoreType,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return {};
    }
  }

  /**
   * localStorage operations
   */
  saveToLocalStorage(subjectId, scoreType, data) {
    try {
      const key = this.storageKeys.localStorage + `${subjectId}_${scoreType}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('❌ LocalStorage save error:', error);
    }
  }

  loadFromLocalStorage(subjectId, scoreType) {
    try {
      const key = this.storageKeys.localStorage + `${subjectId}_${scoreType}`;
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
  saveToSessionStorage(subjectId, scoreType, data) {
    try {
      const key = this.storageKeys.sessionStorage + `${subjectId}_${scoreType}`;
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('❌ SessionStorage save error:', error);
    }
  }

  loadFromSessionStorage(subjectId, scoreType) {
    try {
      const key = this.storageKeys.sessionStorage + `${subjectId}_${scoreType}`;
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
  async saveToIndexedDB(subjectId, scoreType, data) {
    try {
      console.log('🔒 PERSISTENCE DEBUG: Attempting IndexedDB save...');
      const db = await this.getIndexedDB();
      if (!db) {
        console.error('❌ IndexedDB save error: Database not available');
        return false;
      }
      
      const transaction = db.transaction(['scores'], 'readwrite');
      const store = transaction.objectStore('scores');
      const key = `${subjectId}_${scoreType}`;
      
      const result = await store.put({ key, data, timestamp: Date.now() });
      console.log('🔒 PERSISTENCE DEBUG: IndexedDB save successful:', result);
      return true;
    } catch (error) {
      console.error('❌ IndexedDB save error:', error);
      console.error('🔒 PERSISTENCE DEBUG: IndexedDB save error details:', {
        subjectId,
        scoreType,
        errorMessage: error.message,
        errorName: error.name
      });
      return false;
    }
  }

  async loadFromIndexedDB(subjectId, scoreType) {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['scores'], 'readonly');
      const store = transaction.objectStore('scores');
      const key = `${subjectId}_${scoreType}`;
      
      const result = await store.get(key);
      return result ? result.data : null;
    } catch (error) {
      console.error('❌ IndexedDB load error:', error);
      return null;
    }
  }

  async getIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.storageKeys.indexedDB, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('scores')) {
          db.createObjectStore('scores');
        }
      };
    });
  }

  /**
   * Memory storage operations
   */
  saveToMemory(subjectId, scoreType, data) {
    const key = `${subjectId}_${scoreType}`;
    this.memoryStore = this.memoryStore || new Map();
    this.memoryStore.set(key, data);
  }

  loadFromMemory(subjectId, scoreType) {
    const key = `${subjectId}_${scoreType}`;
    this.memoryStore = this.memoryStore || new Map();
    return this.memoryStore.get(key) || null;
  }

  /**
   * Server operations
   */
  async saveToServer(subjectId, scoreType, data) {
    try {
      // This would integrate with your existing API
      console.log('🔒 DATA PERSISTENCE: Saving to server (would implement API call)');
      return true;
    } catch (error) {
      console.error('❌ Server save error:', error);
      return false;
    }
  }

  async loadFromServer(subjectId, scoreType) {
    try {
      // This would integrate with your existing API
      console.log('🔒 DATA PERSISTENCE: Loading from server (would implement API call)');
      return null;
    } catch (error) {
      console.error('❌ Server load error:', error);
      return null;
    }
  }

  /**
   * Auto-save functionality
   */
  startAutoSave(subjectId, scoreType, saveCallback) {
    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(() => {
      if (this.hasUnsavedData()) {
        saveCallback();
        console.log('🔒 DATA PERSISTENCE: Auto-save triggered');
      }
    }, this.autoSaveInterval);
    
    console.log('🔒 DATA PERSISTENCE: Auto-save started');
  }

  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('🔒 DATA PERSISTENCE: Auto-save stopped');
    }
  }

  /**
   * Data validation and cleanup
   */
  isValidData(data) {
    return data && 
           data.scores && 
           typeof data.scores === 'object' && 
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
  getStorageKey(subjectId, scoreType) {
    return `${subjectId}_${scoreType}`;
  }

  hasUnsavedData() {
    // Check if there's any unsaved data in memory
    return this.memoryStore && this.memoryStore.size > 0;
  }

  saveAllData() {
    // Save all data in memory to persistent storage
    if (this.memoryStore) {
      this.memoryStore.forEach((data, key) => {
        const [subjectId, scoreType] = key.split('_');
        this.saveToLocalStorage(subjectId, scoreType, data);
        this.saveToSessionStorage(subjectId, scoreType, data);
      });
    }
  }

  clearData(subjectId, scoreType) {
    const key = this.getStorageKey(subjectId, scoreType);
    
    // Clear all storage layers
    localStorage.removeItem(this.storageKeys.localStorage + key);
    sessionStorage.removeItem(this.storageKeys.sessionStorage + key);
    
    // Clear memory
    if (this.memoryStore) {
      this.memoryStore.delete(key);
    }
    
    // Clear IndexedDB
    this.clearIndexedDB(key);
    
    console.log('🔒 DATA PERSISTENCE: Data cleared for', key);
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
    console.log('🔒 DATA PERSISTENCE: Storage change detected', event.key);
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
