import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import DataTable from '../../components/common/DataTable';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { adminAPI } from '../../services/admin';
import { getAxiosBaseURL } from '../../utils/backendUrl';
import { toast } from '../../utils/toast';
import './DatabaseBackups.css';

/** Download via query param (works with cookies + optional Bearer token). */
async function fetchBackupBlob(filename) {
  const base = getAxiosBaseURL().replace(/\/$/, '');
  const url = `${base}/admin/database-backups/download?${new URLSearchParams({ filename })}`;
  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { credentials: 'include', headers });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }
  return res.blob();
}

function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(2)} ${units[index]}`;
}

function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString();
}

function triggerBrowserDownload(blob, filename) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

const DatabaseBackups = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [markedForDelete, setMarkedForDelete] = useState(() => new Set());
  const [restoringFilename, setRestoringFilename] = useState(null);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['database-backups'],
    queryFn: async () => {
      const res = await adminAPI.getDatabaseBackups();
      return res.data || {};
    },
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => adminAPI.runDatabaseBackup(),
    onSuccess: (response) => {
      toast.success('Database backup created successfully');
      const createdBackup = response?.data?.backup;
      if (!createdBackup?.name) {
        queryClient.invalidateQueries({ queryKey: ['database-backups'] });
        return;
      }

      queryClient.setQueryData(['database-backups'], (oldData) => {
        const previous = oldData || {};
        const prevBackups = Array.isArray(previous.backups) ? previous.backups : [];
        const nextBackups = [createdBackup, ...prevBackups.filter((item) => item.name !== createdBackup.name)];
        return {
          ...previous,
          backups: nextBackups.slice(0, 20),
        };
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create backup');
    },
  });

  const downloadBackupMutation = useMutation({
    retry: false,
    mutationFn: async (filename) => {
      const blob = await fetchBackupBlob(filename);
      return { filename, blob };
    },
    onSuccess: ({ filename, blob }) => {
      triggerBrowserDownload(blob, filename);
      toast.success(`Download started: ${filename}`);
    },
    onError: (err) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to download backup');
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (filename) => {
      setRestoringFilename(filename);
      return adminAPI.restoreDatabaseBackup(filename);
    },
    onSuccess: (response) => {
      const restoredFrom = response?.data?.restoredFrom;
      toast.success(
        restoredFrom ? `Database restored from ${restoredFrom}` : 'Database restored successfully'
      );
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to restore backup');
    },
    onSettled: () => {
      setRestoringFilename(null);
    },
  });

  const restoreFileMutation = useMutation({
    mutationFn: async (file) => {
      setRestoringFilename(file.name);
      return adminAPI.restoreDatabaseBackupFromFile(file);
    },
    onSuccess: (response) => {
      const restoredFrom = response?.data?.restoredFrom;
      toast.success(
        restoredFrom ? `Database restored from ${restoredFrom}` : 'Database restored successfully'
      );
      setSelectedRestoreFile(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to restore backup from file');
    },
    onSettled: () => {
      setRestoringFilename(null);
    },
  });

  const deleteBackupsMutation = useMutation({
    mutationFn: async (filenames) => {
      await Promise.all(filenames.map((name) => adminAPI.deleteDatabaseBackup(name)));
      return filenames;
    },
    onSuccess: (deletedFiles) => {
      const deletedSet = new Set(deletedFiles);
      queryClient.setQueryData(['database-backups'], (oldData) => {
        const previous = oldData || {};
        const prevBackups = Array.isArray(previous.backups) ? previous.backups : [];
        return {
          ...previous,
          backups: prevBackups.filter((item) => !deletedSet.has(item.name)),
        };
      });
      setMarkedForDelete((prev) => {
        const next = new Set(prev);
        deletedFiles.forEach((name) => next.delete(name));
        return next;
      });
      toast.success(`${deletedFiles.length} backup file(s) deleted`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete selected backups');
    },
  });

  const toggleMarkForDelete = (filename) => {
    setMarkedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  const confirmDeleteMarked = () => {
    const names = [...markedForDelete];
    if (names.length === 0) return;

    const preview =
      names.length <= 5
        ? names.join('\n')
        : `${names.slice(0, 5).join('\n')}\n… and ${names.length - 5} more`;

    const ok = window.confirm(
      `Permanently delete ${names.length} backup file(s) from the server?\n\n${preview}`
    );
    if (!ok) return;

    deleteBackupsMutation.mutate(names);
  };

  const confirmRestore = (filename) => {
    const ok = window.confirm(
      `Restore the database from "${filename}"?\n\nThis will replace the current database with the backup contents. All data changed since this backup was created will be lost.\n\nConsider generating a new backup first if you need to keep the current state.`
    );
    if (!ok) return;
    restoreBackupMutation.mutate(filename);
  };

  const handleRestoreFilePick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.dump')) {
      toast.error('Please choose a PostgreSQL .dump backup file');
      return;
    }
    setSelectedRestoreFile(file);
  };

  const confirmRestoreFromFile = () => {
    if (!selectedRestoreFile) return;
    const ok = window.confirm(
      `Restore the database from "${selectedRestoreFile.name}"?\n\nThis will replace the current database with the backup contents. All data changed since this backup was created will be lost.\n\nConsider generating a new backup first if you need to keep the current state.`
    );
    if (!ok) return;
    restoreFileMutation.mutate(selectedRestoreFile);
  };

  const runBackupPending = runBackupMutation.isPending;
  const restorePending = restoreBackupMutation.isPending || restoreFileMutation.isPending;

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Backup File',
        render: (value) => (
          <span className="db-backups-filename" title={value}>
            <i className="fas fa-file-archive" aria-hidden />
            {value}
          </span>
        ),
      },
      {
        key: 'sizeBytes',
        header: 'Size',
        render: (value) => <span className="db-backups-size">{formatBytes(value)}</span>,
      },
      {
        key: 'createdAt',
        header: 'Created',
        render: (value) => <span className="db-backups-date">{formatDate(value)}</span>,
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        render: (_, row) => (
          <div className="db-backups-row-actions">
            <button
              type="button"
              className={`excel-btn small db-backups-btn-mark ${markedForDelete.has(row.name) ? 'is-marked' : ''}`}
              onClick={() => toggleMarkForDelete(row.name)}
              disabled={deleteBackupsMutation.isPending}
              aria-pressed={markedForDelete.has(row.name)}
            >
              <i className="fas fa-trash-alt" aria-hidden />
              {markedForDelete.has(row.name) ? 'Marked' : 'Mark'}
            </button>
            <button
              type="button"
              className="excel-btn secondary small"
              onClick={() => downloadBackupMutation.mutate(row.name)}
              disabled={downloadBackupMutation.isPending || restorePending}
            >
              <i className="fas fa-download" aria-hidden />
              Download
            </button>
            <button
              type="button"
              className="excel-btn danger small db-backups-btn-restore"
              onClick={() => confirmRestore(row.name)}
              disabled={restorePending || deleteBackupsMutation.isPending}
            >
              <i
                className={`fas ${restoringFilename === row.name ? 'fa-spinner fa-spin' : 'fa-undo'}`}
                aria-hidden
              />
              {restoringFilename === row.name ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        ),
      },
    ],
    [
      deleteBackupsMutation.isPending,
      downloadBackupMutation,
      markedForDelete,
      restorePending,
      restoringFilename,
    ]
  );

  const backups = data?.backups || [];
  const markedCount = markedForDelete.size;
  const scheduleDays = data?.schedule?.daysOfMonth?.join(', ') || '1, 8, 15, 22';
  const scheduleTz = data?.schedule?.timezone || 'Africa/Dar_es_Salaam';

  return (
    <AdminLayout>
      <div className="database-backups-page">
        <div className="excel-card db-backups-card">
          <div className="excel-card-header">
            <i className="fas fa-database" aria-hidden />
            <span className="admin-page-title">Database Backups</span>
            <div className="header-actions">
              <button
                type="button"
                className="excel-btn secondary small"
                onClick={() => runBackupMutation.mutate()}
                disabled={runBackupPending || restorePending}
              >
                <i className={`fas ${runBackupPending ? 'fa-spinner fa-spin' : 'fa-plus-circle'}`} aria-hidden />
                {runBackupPending ? 'Generating…' : 'Generate Backup'}
              </button>
            </div>
          </div>

          <div className="excel-card-body db-backups-body">
            <p className="admin-page-description">
              Scheduled backups run four times per month (days {scheduleDays} at 02:00,{' '}
              {scheduleTz}). Only the latest {data?.retention?.maxFiles || 20} files are kept on
              the server. Generate a new backup first if you need to preserve the current state
              before restoring.
            </p>

            <section className="db-backups-restore-panel" aria-labelledby="db-backups-restore-heading">
              <div className="db-backups-restore-panel-header">
                <h2 id="db-backups-restore-heading" className="db-backups-panel-title">
                  <i className="fas fa-upload" aria-hidden />
                  Restore from Device
                </h2>
                <p className="db-backups-restore-panel-desc">
                  Pick a <strong>.dump</strong> file you previously downloaded to your computer or
                  phone storage.
                </p>
              </div>
              <div className="db-backups-restore-panel-body">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".dump,application/octet-stream"
                  className="db-backups-file-input"
                  onChange={handleRestoreFilePick}
                  disabled={restorePending}
                />
                <button
                  type="button"
                  className="excel-btn secondary small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={restorePending}
                >
                  <i className="fas fa-folder-open" aria-hidden />
                  Choose Backup File
                </button>
                {selectedRestoreFile ? (
                  <div className="db-backups-selected-file">
                    <span className="db-backups-selected-file-name" title={selectedRestoreFile.name}>
                      <i className="fas fa-file-archive" aria-hidden />
                      {selectedRestoreFile.name}
                    </span>
                    <span className="db-backups-selected-file-size">
                      {formatBytes(selectedRestoreFile.size)}
                    </span>
                    <button
                      type="button"
                      className="excel-btn small db-backups-btn-clear-file"
                      onClick={() => setSelectedRestoreFile(null)}
                      disabled={restorePending}
                      aria-label="Clear selected file"
                    >
                      <i className="fas fa-times" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <span className="db-backups-no-file">No file selected</span>
                )}
                <button
                  type="button"
                  className="excel-btn danger small db-backups-btn-restore"
                  onClick={confirmRestoreFromFile}
                  disabled={!selectedRestoreFile || restorePending}
                >
                  <i
                    className={`fas ${restoreFileMutation.isPending ? 'fa-spinner fa-spin' : 'fa-undo'}`}
                    aria-hidden
                  />
                  {restoreFileMutation.isPending ? 'Restoring…' : 'Restore from File'}
                </button>
              </div>
            </section>

            {restorePending && (
              <div className="db-backups-restore-banner" role="status">
                <i className="fas fa-spinner fa-spin" aria-hidden />
                <p>
                  Restoring database from <strong>{restoringFilename}</strong>. This may take a few
                  minutes — do not close this page.
                </p>
              </div>
            )}

            <div className="db-backups-stats" role="list" aria-label="Backup summary">
              <article className="db-backups-stat db-backups-stat--schedule" role="listitem">
                <div className="db-backups-stat-icon" aria-hidden>
                  <i className="fas fa-calendar-check" />
                </div>
                <div className="db-backups-stat-content">
                  <span className="db-backups-stat-label">Schedule</span>
                  <strong>{data?.schedule?.frequency || '4 per month'}</strong>
                  <span className="db-backups-stat-hint">Days {scheduleDays}</span>
                </div>
              </article>
              <article className="db-backups-stat db-backups-stat--retention" role="listitem">
                <div className="db-backups-stat-icon" aria-hidden>
                  <i className="fas fa-layer-group" />
                </div>
                <div className="db-backups-stat-content">
                  <span className="db-backups-stat-label">Retention</span>
                  <strong>Latest {data?.retention?.maxFiles || 20} files</strong>
                  <span className="db-backups-stat-hint">Older files removed automatically</span>
                </div>
              </article>
              <article className="db-backups-stat db-backups-stat--count" role="listitem">
                <div className="db-backups-stat-icon" aria-hidden>
                  <i className="fas fa-hdd" />
                </div>
                <div className="db-backups-stat-content">
                  <span className="db-backups-stat-label">On Server</span>
                  <strong>{isLoading ? '…' : backups.length}</strong>
                  <span className="db-backups-stat-hint">
                    {backups.length === 1 ? 'backup file' : 'backup files'}
                  </span>
                </div>
              </article>
            </div>

            <section className="db-backups-panel" aria-labelledby="db-backups-list-heading">
              <div className="db-backups-panel-header">
                <div className="db-backups-panel-title-wrap">
                  <h2 id="db-backups-list-heading" className="db-backups-panel-title">
                    <i className="fas fa-list" aria-hidden />
                    Server Backups
                  </h2>
                  {markedCount > 0 && (
                    <span className="db-backups-marked-badge">
                      {markedCount} marked for deletion
                    </span>
                  )}
                </div>
                <div className="db-backups-panel-actions">
                  <button
                    type="button"
                    className="excel-btn danger small"
                    disabled={markedCount === 0 || deleteBackupsMutation.isPending}
                    onClick={confirmDeleteMarked}
                  >
                    <i
                      className={`fas ${deleteBackupsMutation.isPending ? 'fa-spinner fa-spin' : 'fa-trash'}`}
                      aria-hidden
                    />
                    {deleteBackupsMutation.isPending
                      ? 'Deleting…'
                      : markedCount > 0
                        ? `Delete Marked (${markedCount})`
                        : 'Delete Marked'}
                  </button>
                </div>
              </div>

              <div className="db-backups-table-frame">
                {isError ? (
                  <div className="db-backups-error" role="alert">
                    <i className="fas fa-exclamation-circle" aria-hidden />
                    <p>
                      {error?.response?.data?.message ||
                        error?.message ||
                        'Failed to load backups'}
                    </p>
                  </div>
                ) : isLoading ? (
                  <div className="db-backups-loading">
                    <SkeletonLoader type="card" height="120px" />
                    <SkeletonLoader type="card" height="120px" />
                  </div>
                ) : backups.length === 0 ? (
                  <div className="db-backups-empty">
                    <i className="fas fa-database" aria-hidden />
                    <h3>No backups yet</h3>
                    <p>Use &quot;Generate Backup&quot; to create your first database snapshot.</p>
                    <button
                      type="button"
                      className="excel-btn secondary small"
                      onClick={() => runBackupMutation.mutate()}
                      disabled={runBackupPending}
                    >
                      <i className="fas fa-plus-circle" aria-hidden />
                      Generate Backup
                    </button>
                  </div>
                ) : (
                  <DataTable
                    data={backups}
                    columns={columns}
                    searchable={false}
                    exportable
                    title=""
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DatabaseBackups;
