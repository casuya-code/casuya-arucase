/**
 * User Commands – questions visitors ask the public chatbot (for improving AI answers).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './UserCommands.css';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

function formatPageLabel(path) {
  if (!path || path === '—') return null;
  return path.startsWith('/') ? path : `/${path}`;
}

export default function UserCommands() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['user-commands', page, search],
    queryFn: async () => {
      const res = await adminAPI.getUserCommands({
        page,
        limit: 30,
        ...(search ? { search } : {}),
      });
      return res.data;
    },
  });

  const commands = data?.commands || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const stats = data?.stats || { today: 0 };

  const deleteMutation = useMutation({
    mutationFn: (id) => adminAPI.deleteUserCommand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-commands'] });
      toast.success('Command removed.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete');
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => adminAPI.clearUserCommands(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['user-commands'] });
      const n = res.data?.deleted ?? 0;
      toast.success(n ? `Cleared ${n} command(s).` : 'No commands to clear.');
      setPage(1);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to clear commands');
    },
  });

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearAll = () => {
    if (!window.confirm('Delete all logged user commands? This cannot be undone.')) return;
    clearMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="user-commands-page">
        <div className="excel-card user-commands-root-card">
          <div className="excel-card-header">
            <i className="fas fa-comments" aria-hidden="true" />
            User Commands
          </div>

          <div className="excel-card-body">
            <p className="user-commands-intro">
              Questions and prompts from the public website chatbot. Review them to spot gaps and improve AI answers.
            </p>

            <div className="user-commands-stats-grid">
              <div className="user-commands-stat-card">
                <span className="user-commands-stat-icon" aria-hidden="true">
                  <i className="fas fa-database" />
                </span>
                <div className="user-commands-stat-body">
                  <span className="user-commands-stat-value">{pagination.total ?? 0}</span>
                  <span className="user-commands-stat-label">Total logged</span>
                </div>
              </div>
              <div className="user-commands-stat-card user-commands-stat-card--accent">
                <span className="user-commands-stat-icon" aria-hidden="true">
                  <i className="fas fa-calendar-day" />
                </span>
                <div className="user-commands-stat-body">
                  <span className="user-commands-stat-value">{stats.today ?? 0}</span>
                  <span className="user-commands-stat-label">Today</span>
                </div>
              </div>
              <div className="user-commands-stat-card">
                <span className="user-commands-stat-icon" aria-hidden="true">
                  <i className="fas fa-file-alt" />
                </span>
                <div className="user-commands-stat-body">
                  <span className="user-commands-stat-value">{commands.length}</span>
                  <span className="user-commands-stat-label">On this page</span>
                </div>
              </div>
            </div>

            <div className="user-commands-toolbar-card">
              <form className="user-commands-search" onSubmit={onSearchSubmit}>
                <div className="user-commands-search-field">
                  <i className="fas fa-search" aria-hidden="true" />
                  <input
                    type="search"
                    className="excel-input"
                    placeholder="Search commands, replies, or pages…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    aria-label="Search user commands"
                  />
                </div>
                <div className="user-commands-search-actions">
                  <button type="submit" className="excel-btn primary">
                    Search
                  </button>
                  {search ? (
                    <button
                      type="button"
                      className="excel-btn"
                      onClick={() => {
                        setSearchInput('');
                        setSearch('');
                        setPage(1);
                      }}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </form>
              <button
                type="button"
                className="excel-btn danger user-commands-clear-btn"
                onClick={handleClearAll}
                disabled={clearMutation.isPending || (pagination.total ?? 0) === 0}
              >
                <i className="fas fa-trash-alt" aria-hidden="true" /> Clear all
              </button>
            </div>

            {search ? (
              <p className="user-commands-filter-note">
                Showing results for: <strong>{search}</strong>
              </p>
            ) : null}

            {isLoading ? (
              <div className="user-commands-state user-commands-state--loading">
                <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                <span>Loading commands…</span>
              </div>
            ) : error ? (
              <div className="user-commands-state user-commands-state--error">
                <i className="fas fa-exclamation-circle" aria-hidden="true" />
                <span>Failed to load user commands.</span>
              </div>
            ) : commands.length === 0 ? (
              <div className="user-commands-state user-commands-state--empty">
                <i className="fas fa-inbox" aria-hidden="true" />
                <p className="user-commands-state-title">No user commands yet</p>
                <p className="user-commands-state-hint">
                  When visitors use the chatbot on the public site, their questions appear here automatically.
                </p>
              </div>
            ) : (
              <>
                <ul className="user-commands-card-list">
                  {commands.map((row) => {
                    const pageLabel = formatPageLabel(row.page_path);
                    return (
                      <li key={row.id} className="user-commands-card">
                        <div className="user-commands-card-top">
                          <div className="user-commands-card-meta">
                            <time className="user-commands-card-date" dateTime={row.created_at}>
                              <i className="far fa-clock" aria-hidden="true" />
                              {formatDate(row.created_at)}
                            </time>
                            {pageLabel ? (
                              <span className="user-commands-page-badge" title={pageLabel}>
                                {pageLabel}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="user-commands-card-delete"
                            title="Delete command"
                            aria-label="Delete command"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm('Delete this command?')) {
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            <i className="fas fa-trash" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="user-commands-card-section user-commands-card-section--user">
                          <span className="user-commands-card-label">
                            <i className="fas fa-user" aria-hidden="true" /> Visitor asked
                          </span>
                          <p className="user-commands-card-message">{row.message}</p>
                        </div>

                        <div className="user-commands-card-section user-commands-card-section--ai">
                          <span className="user-commands-card-label">
                            <i className="fas fa-robot" aria-hidden="true" /> AI replied
                          </span>
                          <p className="user-commands-card-reply">{row.ai_reply || '—'}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {isFetching && !isLoading ? (
                  <p className="user-commands-fetching">
                    <i className="fas fa-sync-alt fa-spin" aria-hidden="true" /> Updating…
                  </p>
                ) : null}

                {pagination.totalPages > 1 ? (
                  <div className="user-commands-pagination">
                    <button
                      type="button"
                      className="excel-btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <i className="fas fa-chevron-left" aria-hidden="true" /> Previous
                    </button>
                    <span className="user-commands-pagination-label">
                      Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
                    </span>
                    <button
                      type="button"
                      className="excel-btn"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <i className="fas fa-chevron-right" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
