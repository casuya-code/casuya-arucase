import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import DataTable from '../../components/common/DataTable';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { adminAPI } from '../../services/admin';
import { getAxiosBaseURL } from '../../utils/backendUrl';
import { toast } from '../../utils/toast';
import './DatabaseBackups.css';

function buildBackupDownloadUrl(filename) {
  const base = getAxiosBaseURL().replace(/\/$/, '');
  return `${base}/admin/database-backups/download?${new URLSearchParams({ filename })}`;
}

/** Open download URL in a new tab (streams file; avoids buffering large .dump in memory). */
function startBackupDownload(filename) {
  const url = buildBackupDownloadUrl(filename);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
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
      startBackupDownload(filename);
      return filename;
    },
    onSuccess: (filename) => {
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
      <div className="backups-page">
        <div className="backups-shell">
          <header className="backups-top">
            <div>
              <h1 className="backups-top-title">
                <i className="fas fa-database backups-top-icon" aria-hidden></i>
                Database Backups
              </h1>
              <p className="backups-top-sub">
                Scheduled backups run four times per month (days {scheduleDays} at 02:00,{' '}
                {scheduleTz}) — only the latest {data?.retention?.maxFiles || 20} files are kept
                on the server.
              </p>
            </div>
            <div className="backups-top-actions">
              <button
                type="button"
                className="excel-btn primary"
                onClick={() => runBackupMutation.mutate()}
                disabled={runBackupPending || restorePending}
              >
                <i className={`fas ${runBackupPending ? 'fa-spinner fa-spin' : 'fa-plus-circle'}`} aria-hidden />
                {runBackupPending ? 'Generating…' : 'Generate Backup'}
              </button>
            </div>
          </header>

          <div className="backups-stats" role="list" aria-label="Backup summary">
            <article className="backups-stat" role="listitem" style={{ '--accent': '#3b82f6' }}>
              <span className="backups-stat-icon" aria-hidden>
                <i className="fas fa-calendar-check" />
              </span>
              <div className="backups-stat-content">
                <span className="backups-stat-label">Schedule</span>
                <strong>{data?.schedule?.frequency || '4 per month'}</strong>
                <span className="backups-stat-hint">Days {scheduleDays}</span>
              </div>
            </article>
            <article className="backups-stat" role="listitem" style={{ '--accent': '#6366f1' }}>
              <span className="backups-stat-icon" aria-hidden>
                <i className="fas fa-layer-group" />
              </span>
              <div className="backups-stat-content">
                <span className="backups-stat-label">Retention</span>
                <strong>Latest {data?.retention?.maxFiles || 20} files</strong>
                <span className="backups-stat-hint">Older files removed automatically</span>
              </div>
            </article>
            <article className="backups-stat" role="listitem" style={{ '--accent': '#10b981' }}>
              <span className="backups-stat-icon" aria-hidden>
                <i className="fas fa-hdd" />
              </span>
              <div className="backups-stat-content">
                <span className="backups-stat-label">On Server</span>
                <strong>{isLoading ? '…' : backups.length}</strong>
                <span className="backups-stat-hint">
                  {backups.length === 1 ? 'backup file' : 'backup files'}
                </span>
              </div>
            </article>
          </div>

          <div className="excel-card" style={{ '--accent': '#f59e0b' }}>
            <div className="excel-card-header">
              <i className="fas fa-upload"></i> Restore from Device
            </div>
            <div className="excel-card-body">
              <p className="backups-restore-desc">
                Pick a <strong>.dump</strong> file you previously downloaded to your computer or
                phone storage. This will replace the current database — generate a new backup
                first if you need to preserve the current state.
              </p>
              <div className="backups-restore-body">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".dump,application/octet-stream"
                  className="backups-file-input"
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
                  <div className="backups-selected-file">
                    <span className="backups-selected-file-name" title={selectedRestoreFile.name}>
                      <i className="fas fa-file-archive" aria-hidden />
                      {selectedRestoreFile.name}
                    </span>
                    <span className="backups-selected-file-size">
                      {formatBytes(selectedRestoreFile.size)}
                    </span>
                    <button
                      type="button"
                      className="excel-btn small backups-btn-clear-file"
                      onClick={() => setSelectedRestoreFile(null)}
                      disabled={restorePending}
                      aria-label="Clear selected file"
                    >
                      <i className="fas fa-times" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <span className="backups-no-file">No file selected</span>
                )}
                <button
                  type="button"
                  className="excel-btn danger small"
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
              {restorePending && (
                <div className="backups-restore-banner" role="status">
                  <i className="fas fa-spinner fa-spin" aria-hidden />
                  <p>
                    Restoring database from <strong>{restoringFilename}</strong>. This may take a
                    few minutes — do not close this page.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="excel-card" style={{ '--accent': '#3b82f6' }}>
            <div className="excel-card-header">
              <i className="fas fa-list"></i> Server Backups
              {markedCount > 0 && (
                <span className="excel-card-count">{markedCount} marked</span>
              )}
              <div className="backups-card-actions">
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
            <div className="excel-card-body backups-table-frame">
              {isError ? (
                <div className="backups-error" role="alert">
                  <i className="fas fa-exclamation-circle" aria-hidden />
                  <p>
                    {error?.response?.data?.message || error?.message || 'Failed to load backups'}
                  </p>
                </div>
              ) : isLoading ? (
                <div className="backups-loading">
                  <SkeletonLoader type="card" height="120px" />
                  <SkeletonLoader type="card" height="120px" />
                </div>
              ) : backups.length === 0 ? (
                <div className="backups-empty">
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
                <DataTable data={backups} columns={columns} searchable={false} exportable title="" />
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DatabaseBackups;
