jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

const {
  DEFAULT_MESSAGE,
  computeMaintenanceActive,
  normalizeMaintenancePayload,
  statusView,
} = require('../../utils/maintenance');

const base = {
  enabled: true,
  message: 'Down for upgrades',
  mode: 'everyone',
  startsAt: null,
  endsAt: null,
};

describe('maintenance mode helpers', () => {
  it('is inactive when the master switch is off', () => {
    expect(computeMaintenanceActive({ ...base, enabled: false })).toBe(false);
  });

  it('is active with no schedule window', () => {
    expect(computeMaintenanceActive(base, new Date('2026-05-01T10:00:00Z'))).toBe(true);
  });

  it('respects a future start time', () => {
    const settings = { ...base, startsAt: '2026-05-01T12:00:00.000Z' };
    expect(computeMaintenanceActive(settings, new Date('2026-05-01T10:00:00Z'))).toBe(false);
    expect(computeMaintenanceActive(settings, new Date('2026-05-01T13:00:00Z'))).toBe(true);
  });

  it('stops being active after the end time', () => {
    const settings = { ...base, endsAt: '2026-05-01T12:00:00.000Z' };
    expect(computeMaintenanceActive(settings, new Date('2026-05-01T11:00:00Z'))).toBe(true);
    expect(computeMaintenanceActive(settings, new Date('2026-05-01T12:30:00Z'))).toBe(false);
  });

  it('normalises the payload and defaults an empty message', () => {
    const result = normalizeMaintenancePayload({
      enabled: 'true',
      message: '   ',
      mode: 'logged_in',
      startsAt: '',
      endsAt: null,
    });
    expect(result).toEqual({
      enabled: true,
      message: DEFAULT_MESSAGE,
      mode: 'logged_in',
      startsAt: null,
      endsAt: null,
    });
  });

  it('rejects an invalid mode', () => {
    expect(() => normalizeMaintenancePayload({ mode: 'nobody' }))
      .toThrow(/mode must be one of/);
  });

  it('rejects an end time before the start time', () => {
    expect(() => normalizeMaintenancePayload({
      startsAt: '2026-05-02T10:00:00Z',
      endsAt: '2026-05-01T10:00:00Z',
    })).toThrow(/endsAt must be after startsAt/);
  });

  it('returns a public status view', () => {
    const now = new Date('2026-05-01T10:00:00Z');
    const view = statusView(base, now);
    expect(view.active).toBe(true);
    expect(view.mode).toBe('everyone');
    expect(view.serverTime).toBe(now.toISOString());
  });
});
