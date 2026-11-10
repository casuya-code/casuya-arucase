import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { maintenanceAPI } from '../../services/maintenance';
import { toast } from '../../utils/toast';
import './Maintenance.css';

const DEFAULT_FORM = {
  enabled: false,
  message: 'The website is currently under maintenance. Please check back soon.',
  mode: 'everyone',
  startsAt: '',
  endsAt: '',
};

function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatWhen(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function statusLabel(status) {
  if (!status) return { text: 'Unknown', tone: 'muted' };
  if (status.active) return { text: 'Active now', tone: 'danger' };
  if (!status.enabled) return { text: 'Off', tone: 'muted' };
  if (status.startsAt && new Date(status.startsAt).getTime() > Date.now()) {
    return { text: 'Scheduled', tone: 'warning' };
  }
  return { text: 'Ended / inactive', tone: 'muted' };
}

const Maintenance = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['maintenance-settings'],
    queryFn: async () => {
      const res = await maintenanceAPI.getSettings();
      return res.data || {};
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data?.settings) return;
    setForm({
      enabled: Boolean(data.settings.enabled),
      message: data.settings.message || DEFAULT_FORM.message,
      mode: data.settings.mode === 'logged_in' ? 'logged_in' : 'everyone',
      startsAt: toLocalInput(data.settings.startsAt),
      endsAt: toLocalInput(data.settings.endsAt),
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => maintenanceAPI.updateSettings({
      enabled: form.enabled,
      message: form.message,
      mode: form.mode,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
    }),
    onSuccess: (response) => {
      toast.success('Maintenance settings saved');
      queryClient.setQueryData(['maintenance-settings'], response.data || {});
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to save maintenance settings');
    },
  });

  const status = data?.status;
  const badge = statusLabel(status);
  const scheduleInvalid = form.startsAt && form.endsAt
    && new Date(form.endsAt).getTime() < new Date(form.startsAt).getTime();

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <AdminLayout>
      <div className="maintenance-admin-page">
        <div className="maintenance-admin-shell">
          <header className="maintenance-admin-top">
            <div>
              <h1 className="maintenance-admin-title">
                <i className="fas fa-tools maintenance-admin-title-icon" aria-hidden="true" />
                Maintenance Mode
              </h1>
              <p className="maintenance-admin-sub">
                Put the public website and staff app behind a maintenance notice.
                Superadmins always keep full access.
              </p>
            </div>
            <span className={`maintenance-badge maintenance-badge--${badge.tone}`}>
              {badge.text}
            </span>
          </header>

          {isLoading ? (
            <div className="maintenance-admin-card">Loading settings…</div>
          ) : isError ? (
            <div className="maintenance-admin-card maintenance-admin-error">
              Could not load maintenance settings.
              <button type="button" className="maintenance-btn secondary" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : (
            <form
              className="maintenance-admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (scheduleInvalid) {
                  toast.error('End time must be after the start time');
                  return;
                }
                saveMutation.mutate();
              }}
            >
              <section className="maintenance-admin-card">
                <div className="maintenance-switch-row">
                  <div>
                    <h2 className="maintenance-admin-heading">Enable maintenance</h2>
                    <p className="maintenance-admin-help">
                      Turn this on to show the notice. A schedule below can start and stop it automatically.
                    </p>
                  </div>
                  <label className="maintenance-switch">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(event) => update({ enabled: event.target.checked })}
                    />
                    <span className="maintenance-switch-slider" aria-hidden="true" />
                    <span className="maintenance-switch-label">
                      {form.enabled ? 'On' : 'Off'}
                    </span>
                  </label>
                </div>
              </section>

              <section className="maintenance-admin-card">
                <h2 className="maintenance-admin-heading">Who sees it</h2>
                <div className="maintenance-mode-grid">
                  <label className={`maintenance-mode ${form.mode === 'everyone' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="maintenance-mode"
                      value="everyone"
                      checked={form.mode === 'everyone'}
                      onChange={() => update({ mode: 'everyone' })}
                    />
                    <span className="maintenance-mode-title">Everyone</span>
                    <span className="maintenance-mode-text">
                      The whole public website and all normal users see the maintenance notice.
                    </span>
                  </label>
                  <label className={`maintenance-mode ${form.mode === 'logged_in' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="maintenance-mode"
                      value="logged_in"
                      checked={form.mode === 'logged_in'}
                      onChange={() => update({ mode: 'logged_in' })}
                    />
                    <span className="maintenance-mode-title">After login</span>
                    <span className="maintenance-mode-text">
                      The public website stays open. Normal users see the notice only after signing in.
                    </span>
                  </label>
                </div>
              </section>

              <section className="maintenance-admin-card">
                <h2 className="maintenance-admin-heading">Notice message</h2>
                <textarea
                  className="maintenance-textarea"
                  rows={4}
                  maxLength={2000}
                  value={form.message}
                  onChange={(event) => update({ message: event.target.value })}
                  placeholder="Tell visitors what is happening and when the site will be back."
                />
                <p className="maintenance-admin-help">
                  {form.message.length}/2000 characters. Shown on the maintenance screen.
                </p>
              </section>

              <section className="maintenance-admin-card">
                <h2 className="maintenance-admin-heading">Schedule (optional)</h2>
                <p className="maintenance-admin-help">
                  Leave a field blank for “start now” / “no end”. Times use your device timezone.
                </p>
                <div className="maintenance-schedule-grid">
                  <label className="maintenance-field">
                    <span>Starts</span>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(event) => update({ startsAt: event.target.value })}
                    />
                  </label>
                  <label className="maintenance-field">
                    <span>Ends</span>
                    <input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(event) => update({ endsAt: event.target.value })}
                    />
                  </label>
                </div>
                {scheduleInvalid && (
                  <p className="maintenance-admin-warning">End time must be after the start time.</p>
                )}
                <dl className="maintenance-summary">
                  <div>
                    <dt>Current status</dt>
                    <dd>{status?.active ? 'Active now' : badge.text}</dd>
                  </div>
                  <div>
                    <dt>Starts</dt>
                    <dd>{formatWhen(status?.startsAt)}</dd>
                  </div>
                  <div>
                    <dt>Ends</dt>
                    <dd>{formatWhen(status?.endsAt)}</dd>
                  </div>
                  <div>
                    <dt>Last saved by</dt>
                    <dd>{data?.settings?.updatedBy || '—'}</dd>
                  </div>
                </dl>
              </section>

              <div className="maintenance-admin-actions">
                <button
                  type="submit"
                  className="maintenance-btn primary"
                  disabled={saveMutation.isPending || scheduleInvalid}
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save settings'}
                </button>
                <button
                  type="button"
                  className="maintenance-btn secondary"
                  onClick={() => refetch()}
                  disabled={saveMutation.isPending}
                >
                  Refresh
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Maintenance;
