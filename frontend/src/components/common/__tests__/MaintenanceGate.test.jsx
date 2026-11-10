import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const authState = vi.hoisted(() => ({
  user: null,
  loading: false,
  logout: vi.fn(),
}));

const maintenanceMock = vi.hoisted(() => ({ getStatus: vi.fn() }));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../../../services/maintenance', () => ({
  maintenanceAPI: { getStatus: maintenanceMock.getStatus },
}));

import MaintenanceGate from '../MaintenanceGate';

const ACTIVE_STATUS = {
  enabled: true,
  active: true,
  message: 'We will be back shortly.',
  mode: 'everyone',
  startsAt: null,
  endsAt: null,
  serverTime: '2026-05-01T10:00:00.000Z',
};

function renderGate(path = '/about') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MaintenanceGate>
        <div>APP CONTENT</div>
      </MaintenanceGate>
    </MemoryRouter>
  );
}

function setUser(user) {
  authState.user = user;
  authState.loading = false;
}

describe('MaintenanceGate', () => {
  beforeEach(() => {
    setUser(null);
    authState.logout.mockClear();
    maintenanceMock.getStatus.mockReset();
  });

  it('shows the app when maintenance is off', async () => {
    maintenanceMock.getStatus.mockResolvedValue({
      data: { ...ACTIVE_STATUS, enabled: false, active: false },
    });
    renderGate();
    expect(await screen.findByText('APP CONTENT')).toBeTruthy();
  });

  it('blocks the public with the notice in everyone mode', async () => {
    maintenanceMock.getStatus.mockResolvedValue({ data: ACTIVE_STATUS });
    renderGate();
    expect(await screen.findByText('Website under maintenance')).toBeTruthy();
    expect(screen.getByText('We will be back shortly.')).toBeTruthy();
    expect(screen.queryByText('APP CONTENT')).toBeFalsy();
    expect(screen.queryByRole('button', { name: 'Log out' })).toBeFalsy();
  });

  it('always lets a superadmin through', async () => {
    setUser({ username: 'SUPERADMIN', full_name: 'Super Admin', role: 'superadmin' });
    maintenanceMock.getStatus.mockResolvedValue({ data: ACTIVE_STATUS });
    renderGate();
    expect(await screen.findByText('APP CONTENT')).toBeTruthy();
    expect(screen.queryByText('Website under maintenance')).toBeFalsy();
  });

  it('keeps the public site open in logged_in mode', async () => {
    maintenanceMock.getStatus.mockResolvedValue({
      data: { ...ACTIVE_STATUS, mode: 'logged_in' },
    });
    renderGate();
    expect(await screen.findByText('APP CONTENT')).toBeTruthy();
  });

  it('shows the notice and logout button to a signed-in normal user in logged_in mode', async () => {
    setUser({ username: 'TYSON', full_name: 'Tyson Teacher', role: 'teacher' });
    maintenanceMock.getStatus.mockResolvedValue({
      data: { ...ACTIVE_STATUS, mode: 'logged_in' },
    });
    renderGate();
    expect(await screen.findByText('Website under maintenance')).toBeTruthy();
    expect(screen.getByText('Tyson Teacher')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(authState.logout).toHaveBeenCalledTimes(1);
  });

  it('keeps the staff sign-in screen reachable while everyone is blocked', async () => {
    maintenanceMock.getStatus.mockResolvedValue({ data: ACTIVE_STATUS });
    renderGate('/login');
    expect(await screen.findByText('APP CONTENT')).toBeTruthy();
  });

  it('fails open when the status endpoint is unreachable', async () => {
    maintenanceMock.getStatus.mockRejectedValue(new Error('offline'));
    renderGate();
    expect(await screen.findByText('APP CONTENT')).toBeTruthy();
  });

  it('waits for the session restore before showing the notice', async () => {
    setUser(null);
    authState.loading = true;
    maintenanceMock.getStatus.mockResolvedValue({
      data: { ...ACTIVE_STATUS, mode: 'logged_in' },
    });
    renderGate();
    expect(await screen.findByText('Checking site status…')).toBeTruthy();
  });
});
