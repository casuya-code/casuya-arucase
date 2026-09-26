import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DataPersistenceManager,
  buildScopeKey,
  parseScopeKey,
  normalizeScoresMap,
} from '../dataPersistenceManager';

// The test environment exposes window but not the Web Storage APIs, so the
// persistence layers run against a deterministic in-memory Storage.
function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe('dataPersistenceManager scope keys', () => {
  describe('buildScopeKey', () => {
    it('includes the cohort so sheets cannot bleed across years', () => {
      expect(buildScopeKey(7, 'interview', 2026)).toBe('2026_7_interview');
      expect(buildScopeKey(7, 'interview', 2025)).toBe('2025_7_interview');
      expect(buildScopeKey(7, 'interview', 2026)).not.toBe(
        buildScopeKey(7, 'interview', 2025)
      );
    });

    it('marks a missing year explicitly instead of dropping it', () => {
      expect(buildScopeKey(7, 'interview')).toBe('noyear_7_interview');
      expect(buildScopeKey(7, 'interview', '')).toBe('noyear_7_interview');
      expect(buildScopeKey(7, 'interview', null)).toBe('noyear_7_interview');
    });
  });

  describe('parseScopeKey', () => {
    it('round-trips a scoped key', () => {
      expect(parseScopeKey(buildScopeKey(7, 'interview', 2026))).toEqual({
        year: '2026',
        subjectId: '7',
        scoreType: 'interview',
      });
    });

    it('keeps underscores inside a subject id', () => {
      expect(parseScopeKey('2026_12_3_continuing')).toEqual({
        year: '2026',
        subjectId: '12_3',
        scoreType: 'continuing',
      });
    });

    it('reports a null year for unscoped keys', () => {
      expect(parseScopeKey('noyear_7_interview').year).toBeNull();
    });

    it('rejects legacy unscoped and malformed keys', () => {
      expect(parseScopeKey('7_interview')).toBeNull();
      expect(parseScopeKey(null)).toBeNull();
      expect(parseScopeKey(42)).toBeNull();
    });
  });

  describe('normalizeScoresMap', () => {
    it('unwraps the legacy double-wrapped payload', () => {
      expect(normalizeScoresMap({ scores: { 1: { score: 70 } } })).toEqual({ 1: { score: 70 } });
    });

    it('leaves a normal map untouched', () => {
      const map = { 1: { score: 70, grade: 'B' } };
      expect(normalizeScoresMap(map)).toBe(map);
    });

    it('returns an empty map for unusable input', () => {
      expect(normalizeScoresMap(null)).toEqual({});
      expect(normalizeScoresMap([1, 2])).toEqual({});
    });
  });
});

describe('DataPersistenceManager year isolation', () => {
  let manager;
  let localStorageRef;
  let sessionStorageRef;

  beforeEach(() => {
    localStorageRef = createMemoryStorage();
    sessionStorageRef = createMemoryStorage();
    vi.stubGlobal('localStorage', localStorageRef);
    vi.stubGlobal('sessionStorage', sessionStorageRef);

    manager = new DataPersistenceManager();
    manager.isOnline = false;
    manager.saveToIndexedDB = vi.fn().mockResolvedValue(true);
    manager.loadFromIndexedDB = vi.fn().mockResolvedValue(null);
    manager.clearIndexedDB = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('never restores another cohort on the same subject', async () => {
    await manager.saveData(7, 'interview', { 1: { score: 70 } }, { year: 2026 });
    await manager.saveData(7, 'interview', { 2: { score: 80 } }, { year: 2025 });

    const loaded2026 = await manager.loadData(7, 'interview', { year: 2026 });
    const loaded2025 = await manager.loadData(7, 'interview', { year: 2025 });

    expect(loaded2026).toEqual({ 1: { score: 70 } });
    expect(loaded2025).toEqual({ 2: { score: 80 } });
  });

  it('keeps the two score types of a cohort apart', async () => {
    await manager.saveData(7, 'interview', { 1: { score: 70 } }, { year: 2026 });
    await manager.saveData(7, 'continuing', { 1: { score: 55 } }, { year: 2026 });

    expect(await manager.loadData(7, 'interview', { year: 2026 })).toEqual({ 1: { score: 70 } });
    expect(await manager.loadData(7, 'continuing', { year: 2026 })).toEqual({ 1: { score: 55 } });
  });

  it('writes a distinct storage entry per cohort', async () => {
    await manager.saveData(7, 'interview', { 1: { score: 70 } }, { year: 2026 });
    await manager.saveData(7, 'interview', { 2: { score: 80 } }, { year: 2025 });

    expect(localStorageRef.getItem('preformone_scores_2026_7_interview')).toBeTruthy();
    expect(localStorageRef.getItem('preformone_scores_2025_7_interview')).toBeTruthy();
    expect(sessionStorageRef.getItem('preformone_scores_session_2026_7_interview')).toBeTruthy();
  });

  it('clears only the requested cohort', async () => {
    await manager.saveData(7, 'interview', { 1: { score: 70 } }, { year: 2026 });
    await manager.saveData(7, 'interview', { 2: { score: 80 } }, { year: 2025 });

    manager.clearData(7, 'interview', { year: 2026 });

    expect(localStorageRef.getItem('preformone_scores_2026_7_interview')).toBeNull();
    expect(localStorageRef.getItem('preformone_scores_2025_7_interview')).toBeTruthy();
    expect(await manager.loadData(7, 'interview', { year: 2025 })).toEqual({ 2: { score: 80 } });
    expect(await manager.loadData(7, 'interview', { year: 2026 })).toEqual({});
  });

  it('persists the scope alongside the data', async () => {
    await manager.saveData(7, 'interview', { 1: { score: 70 } }, { year: 2026 });
    const stored = JSON.parse(localStorageRef.getItem('preformone_scores_2026_7_interview'));
    expect(stored.scope).toEqual({ subjectId: 7, scoreType: 'interview', year: 2026 });
  });

  it('does not read legacy unscoped keys', async () => {
    localStorageRef.setItem(
      'preformone_scores_7_interview',
      JSON.stringify({ scores: { 9: { score: 10 } }, timestamp: Date.now() })
    );
    expect(await manager.loadData(7, 'interview', { year: 2026 })).toEqual({});
  });

  describe('offline queue', () => {
    it('queues a save per cohort instead of throwing', async () => {
      const saved = await manager.saveData(7, 'interview', { 1: { score: 70 } }, { year: 2026 });
      expect(saved).toBe(true);
      expect(manager.hasPendingSaves()).toBe(true);
      expect([...manager.pendingSaves.keys()]).toEqual(['2026_7_interview']);
    });

    it('replays each pending scope with its own year on reconnect', async () => {
      await manager.saveData(7, 'interview', { 1: { score: 70 } }, { year: 2026 });
      await manager.saveData(7, 'interview', { 2: { score: 80 } }, { year: 2025 });

      const sync = vi.fn().mockResolvedValue(true);
      manager.saveToServer = sync;

      await manager.syncPendingData();

      expect(sync).toHaveBeenCalledTimes(2);
      expect(sync).toHaveBeenCalledWith('7', 'interview', expect.any(Object), '2026');
      expect(sync).toHaveBeenCalledWith('7', 'interview', expect.any(Object), '2025');
      expect(manager.hasPendingSaves()).toBe(false);
    });

    it('keeps an entry queued when the replay fails', async () => {
      await manager.saveData(7, 'interview', { 1: { score: 70 } }, { year: 2026 });
      manager.saveToServer = vi.fn().mockRejectedValue(new Error('offline'));
      await manager.syncPendingData();
      expect(manager.hasPendingSaves()).toBe(true);
    });
  });

  describe('saveAllData', () => {
    it('replays every memory entry under its own cohort key', async () => {
      await manager.saveData(7, 'interview', { 1: { score: 70 } }, { year: 2026 });
      await manager.saveData(8, 'continuing', { 2: { score: 60 } }, { year: 2025 });
      localStorageRef.clear();

      manager.saveAllData();

      expect(localStorageRef.getItem('preformone_scores_2026_7_interview')).toBeTruthy();
      expect(localStorageRef.getItem('preformone_scores_2025_8_continuing')).toBeTruthy();
    });
  });
});
