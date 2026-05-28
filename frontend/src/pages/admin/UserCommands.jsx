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
        limit: 50,
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
        <header className="user-commands-header">
          <div>
            <h1>
              <i className="fas fa-comments" aria-hidden="true" /> User Commands
            </h1>
            <p>
              Questions and prompts from the public website chatbot. Use these to spot gaps and improve AI answers.
            </p>
          </div>
          <div className="user-commands-stats">
            <div className="user-commands-stat">
              <span className="user-commands-stat-value">{pagination.total ?? 0}</span>
              <span className="user-commands-stat-label">Total logged</span>
            </div>
            <div className="user-commands-stat">
              <span className="user-commands-stat-value">{stats.today ?? 0}</span>
              <span className="user-commands-stat-label">Today</span>
            </div>
          </div>
        </header>

        <div className="user-commands-toolbar">
          <form className="user-commands-search" onSubmit={onSearchSubmit}>
            <input
              type="search"
              className="excel-input"
              placeholder="Search commands or replies…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="excel-btn primary">
              <i className="fas fa-search" aria-hidden="true" /> Search
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
          </form>
          <button
            type="button"
            className="excel-btn danger"
            onClick={handleClearAll}
            disabled={clearMutation.isPending || (pagination.total ?? 0) === 0}
          >
            <i className="fas fa-trash-alt" aria-hidden="true" /> Clear all
          </button>
        </div>

        {isLoading ? (
          <p className="user-commands-loading">Loading commands…</p>
        ) : error ? (
          <p className="user-commands-error">Failed to load user commands.</p>
        ) : commands.length === 0 ? (
          <div className="user-commands-empty">
            <i className="fas fa-inbox" aria-hidden="true" />
            <p>No user commands logged yet.</p>
            <p className="user-commands-empty-hint">
              When visitors use the chatbot on the public site, their questions appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="user-commands-table-wrap">
              <table className="excel-table user-commands-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User command</th>
                    <th>AI reply</th>
                    <th>Page</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {commands.map((row) => (
                    <tr key={row.id}>
                      <td className="user-commands-when">{formatDate(row.created_at)}</td>
                      <td className="user-commands-message">{row.message}</td>
                      <td className="user-commands-reply">{row.ai_reply || '—'}</td>
                      <td className="user-commands-page-path">{row.page_path || '—'}</td>
                      <td className="user-commands-actions">
                        <button
                          type="button"
                          className="excel-btn danger small"
                          title="Delete"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm('Delete this command?')) {
                              deleteMutation.mutate(row.id);
                            }
                          }}
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isFetching && !isLoading ? (
              <p className="user-commands-fetching">Updating…</p>
            ) : null}

            {pagination.totalPages > 1 ? (
              <div className="user-commands-pagination">
                <button
                  type="button"
                  className="excel-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="excel-btn"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
