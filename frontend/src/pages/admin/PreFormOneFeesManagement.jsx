/**
 * Pre-Form One Fees Announcements Management Page
 *
 * Pre-Form One has no streams or terms: a year is the only selector and the
 * announcements (up to 10, "MAMBO YA KUFAHAMU") are stored once per year. They
 * appear in the instructions section of the continuing report card.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { preFormOneService } from '../../services/preFormOneService';
import { useGoBack } from '../../hooks/useGoBack';
import './FeesManagement.css';
import './preform-one-modern.css';
import { CSV_BULK_LABELS, CSV_BULK_TITLES } from '../../constants/csvBulkActions';

const PreFormOneFeesManagement = () => {
  const { year } = useParams();
  const queryClient = useQueryClient();
  const goBack = useGoBack('/admin/pre-form-one-fees');

  const [announcements, setAnnouncements] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch existing announcements
  const { data: existingAnnouncements = {}, isLoading, error } = useQuery({
    queryKey: ['pre-form-one-fees-announcements', year],
    queryFn: async () => {
      try {
        const res = await preFormOneService.getFeesAnnouncements(year);
        return res.announcements || {};
      } catch (err) {
        console.error('Error fetching Pre-Form One fees announcements:', err);
        return {};
      }
    },
    enabled: !!year,
    retry: (failureCount, err) => {
      if (err?.response?.status === 401 || err?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });

  useEffect(() => {
    // Guard on a non-empty payload: existingAnnouncements defaults to a fresh {}
    // while the query is pending, and setting state to a new object on every
    // render would re-run this effect forever (starving timers in tests).
    if (Object.keys(existingAnnouncements).length > 0) {
      setAnnouncements(existingAnnouncements);
    }
  }, [existingAnnouncements]);

  const saveMutation = useMutation({
    mutationFn: async (data) => preFormOneService.saveFeesAnnouncements(year, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pre-form-one-fees-announcements', year]);
      toast.success('Fees announcements updated successfully!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save announcements');
    },
  });

  const handleChange = useCallback((index, value) => {
    setAnnouncements((prev) => ({ ...prev, [index]: value }));
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      saveMutation.mutate(announcements);
    },
    [announcements, saveMutation],
  );

  const csvEscape = (val) => {
    const s = String(val ?? '').trim();
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const parseLine = (line, delimiter = ',') => {
    if (delimiter === '\t') {
      return line.split('\t').map((cell) => String(cell).trim().replace(/^\uFEFF/, ''));
    }
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (inQuotes) {
        cur += c;
      } else if (c === delimiter) {
        out.push(cur.trim().replace(/^\uFEFF/, ''));
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur.trim().replace(/^\uFEFF/, ''));
    return out;
  };

  const normalizeHeader = (h) =>
    String(h ?? '')
      .trim()
      .replace(/\uFEFF/g, '')
      .replace(/\s/g, '')
      .toLowerCase();

  const buildAnnouncementsCsv = (data) => {
    const headerRow = ['S/N', 'MATANGAZO'].join(',');
    const rows = Array.from({ length: 10 }, (_, i) => {
      const index = String(i + 1);
      return [csvEscape(index), csvEscape(data[index] || '')].join(',');
    });
    return [headerRow, ...rows].join('\r\n');
  };

  const downloadCsv = (csv, filename) => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvFilename = `pre_form_one_fees_announcements_${year}.csv`;

  const handleDownloadTemplate = useCallback(() => {
    downloadCsv(buildAnnouncementsCsv({}), csvFilename.replace('.csv', '_template.csv'));
    toast.success('CSV template downloaded');
  }, [csvFilename]);

  const handleDownloadFilledCSV = useCallback(() => {
    downloadCsv(buildAnnouncementsCsv(announcements), csvFilename.replace('.csv', '_filled.csv'));
    toast.success('Filled fees CSV downloaded');
  }, [announcements, csvFilename]);

  const handleUploadCsv = useCallback(
    (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      e.target.value = '';
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setUploading(true);

      const run = async () => {
        try {
          let text = await file.text();
          text = text.replace(/^\uFEFF/, '');
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          if (lines.length < 2) {
            toast.error('CSV must have a header row and at least one data row');
            return;
          }

          const firstLine = lines[0];
          const delimiter = firstLine.includes('\t') && firstLine.split('\t').length >= 2 ? '\t' : ',';
          const rawHeaderCells = parseLine(firstLine, delimiter);
          const header = rawHeaderCells.map(normalizeHeader);

          const snIdx = header.findIndex(
            (h) => h === 'sn' || h === 's/n' || h === 'serial' || h === 'index' || h === 'no',
          );
          const textIdx = header.findIndex(
            (h) =>
              h === 'matangazo' ||
              h === 'announcement' ||
              h === 'matangazo_text' ||
              h === 'text' ||
              h === 'message',
          );

          if (textIdx === -1) {
            toast.error('CSV must include a "MATANGAZO" column (announcement text)');
            return;
          }

          const parsed = {};
          for (let i = 1; i < lines.length; i++) {
            const cells = parseLine(lines[i], delimiter);
            const rawIndex = snIdx >= 0 ? String(cells[snIdx] ?? '').trim() : String(i);
            const indexNum = parseInt(rawIndex, 10);
            if (Number.isNaN(indexNum) || indexNum < 1 || indexNum > 10) continue;
            parsed[String(indexNum)] = String(cells[textIdx] ?? '').trim();
          }

          if (Object.keys(parsed).length === 0) {
            toast.warning('No valid announcement rows found. Use S/N 1–10 and a MATANGAZO column.');
            return;
          }

          const merged = { ...announcements, ...parsed };
          setAnnouncements(merged);
          await saveMutation.mutateAsync(merged);
        } catch (err) {
          toast.error(err?.response?.data?.message || err?.message || 'CSV upload failed');
        } finally {
          setUploading(false);
        }
      };

      setTimeout(run, 0);
    },
    [announcements, saveMutation],
  );

  return (
    <AdminLayout>
      <div className="fees-mgmt-page">
        <div className="fees-mgmt-shell">
          <div className="breadcrumb">
            <Link to="/admin/pre-form-one-fees">Pre-Form One Fees</Link>
            <span style={{ color: '#bbb' }}>&rsaquo;</span>
            <span className="breadcrumb-current">{year}</span>
          </div>

          <header className="fees-mgmt-top">
            <div>
              <h1 className="fees-mgmt-title">Pre-Form One Fees Announcements</h1>
              <p className="fees-mgmt-sub">PRE-FORM ONE · {year}</p>
            </div>
            <div className="fees-mgmt-actions">
              <button type="button" onClick={goBack} className="excel-btn outline">
                <i className="fas fa-arrow-left"></i> Back
              </button>
            </div>
          </header>

          {isLoading ? (
            <div className="fees-mgmt-loading">
              <i className="fas fa-spinner fa-spin"></i> Loading announcements…
            </div>
          ) : error ? (
            <div className="error-state">
              <p>Error loading fees announcements. Please try again.</p>
              <p style={{ fontSize: '12px', color: '#666' }}>{error.message || 'Unknown error'}</p>
            </div>
          ) : (
            <div className="excel-card" style={{ '--accent': '#10b981' }}>
              <div className="excel-card-header">
                <i className="fas fa-money-bill-wave"></i> Announcements
              </div>
              <div className="excel-card-body">
                <p className="fees-description">
                  Enter fees announcements and important information for Pre-Form One students. These
                  will appear in the instructions section of the continuing report card.
                </p>

                <form onSubmit={handleSubmit} className="fees-form">
                  <div className="table-container">
                    <table className="excel-table announcements-table">
                      <thead>
                        <tr>
                          <th className="table-serial-number">S/N</th>
                          <th>MATANGAZO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((index) => (
                          <tr key={index}>
                            <td className="table-center">{index}</td>
                            <td>
                              <textarea
                                name={`announcement_${index}`}
                                className="announcement-input"
                                placeholder="Enter fees announcement or information..."
                                rows="2"
                                value={announcements[index.toString()] || ''}
                                onChange={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = e.target.scrollHeight + 'px';
                                  handleChange(index.toString(), e.target.value);
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="csv-section">
                    <h3>
                      <i className="fas fa-file-csv"></i> CSV Bulk Operations
                    </h3>
                    <p className="csv-hint">
                      Download the template, fill rows 1–10 under MATANGAZO, then upload to replace
                      the announcements for this year.
                    </p>
                    <div className="csv-actions csv-bulk-actions">
                      <button
                        type="button"
                        className="excel-btn primary"
                        onClick={handleDownloadTemplate}
                        disabled={uploading || saveMutation.isPending}
                        title={CSV_BULK_TITLES.template}
                      >
                        <i className="fas fa-download"></i> {CSV_BULK_LABELS.template}
                      </button>
                      <button
                        type="button"
                        className="excel-btn secondary"
                        onClick={handleDownloadFilledCSV}
                        disabled={uploading || saveMutation.isPending}
                        title={CSV_BULK_TITLES.filled}
                      >
                        <i className="fas fa-download"></i> {CSV_BULK_LABELS.filled}
                      </button>
                      <label
                        className="excel-btn success"
                        style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
                        title={CSV_BULK_TITLES.upload}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleUploadCsv}
                          disabled={uploading || saveMutation.isPending}
                          style={{ display: 'none' }}
                        />
                        <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>{' '}
                        {uploading ? CSV_BULK_LABELS.uploading : CSV_BULK_LABELS.upload}
                      </label>
                    </div>
                  </div>

                  <div className="fees-actions">
                    <button
                      type="submit"
                      className="excel-btn primary"
                      disabled={saveMutation.isPending || uploading}
                    >
                      <i className="fas fa-save"></i>{' '}
                      {saveMutation.isPending ? 'Saving…' : 'Save Announcements'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default PreFormOneFeesManagement;
