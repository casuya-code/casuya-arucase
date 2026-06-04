/**
 * Photo Stream Selection Page for FORM I-IV (after year selection)
 * or FORM V-VI (initial selection).
 * Non-admin users only see FORM V-VI streams (classes) allocated to them.
 */
import { Link, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import { formLevelToPathSlug, getFormVVIYears, getCurrentTerm } from '../../utils/academicYearUtils';
import { useFormVVIStreams } from '../../hooks/useFormVVIStreams';
import { toast } from '../../utils/toast';
import './PhotoStreamSelection.css';

const PhotoStreamSelection = ({ formLevel, isFormVOrVI = false }) => {
  const { year } = useParams();
  const standardStreams = ['A', 'B'];
  const availableYears = useMemo(() => getFormVVIYears(), []);
  const currentTermInfo = useMemo(() => getCurrentTerm(), []);
  const defaultYear = availableYears[0]?.year ?? currentTermInfo.academicYearStart;

  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedTerm, setSelectedTerm] = useState(currentTermInfo.term);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const formVVIStreams = useFormVVIStreams(formLevel, { requireAllocation: isFormVOrVI });

  const formSlug = formLevelToPathSlug(formLevel);

  const getBackPath = () => {
    if (isFormVOrVI) {
      return '/admin/students/photos';
    }
    return `/admin/students/photos/${formSlug}/years`;
  };

  const getStreamDetailPath = (stream) => {
    if (isFormVOrVI) {
      return `/admin/students/photos/${formSlug}/stream/${stream}/years`;
    }
    return `/admin/students/photos/${formSlug}/year/${year}/stream/${stream}`;
  };

  const handleDownloadAllStreamsPhotoEntryForm = async () => {
    if (!selectedYear) {
      toast.error('Please select an academic year');
      return;
    }

    setDownloadingAll(true);
    try {
      const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
      const streamCodes = formVVIStreams.map((s) => s.code);
      const response = await studentsAPI.downloadAllStreamsPhotoEntryFormPDF(
        formLevel,
        selectedYear,
        currentMonth,
        selectedTerm,
        streamCodes
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo_entry_form_${formLevel.replace(/\s+/g, '_')}_ALL_STREAMS_${selectedYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Photo Entry Form (all streams) downloaded successfully!');
    } catch (error) {
      console.error('Error downloading all-streams Photo Entry Form:', error);
      toast.error(error.response?.data?.message || 'Failed to download Photo Entry Form for all streams');
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <AdminLayout>
      <div className="photo-stream-selection-page-container">
        <div className="photo-stream-selection-card">
          <div className="photo-stream-selection-card-header">
            <i className="fas fa-camera"></i>
            <span>
              {formLevel} {year && `- ${year}`} - Select Stream
            </span>
          </div>
          <div className="photo-stream-selection-card-body">
            {isFormVOrVI && formVVIStreams.length === 0 ? (
              <p className="photo-stream-selection-empty">You do not have access to any streams for this form. Contact an administrator.</p>
            ) : (
            <>
              <div className="photo-stream-selection-grid">
                {isFormVOrVI ? (
                  formVVIStreams.map((stream) => (
                    <Link
                      key={stream.code}
                      to={getStreamDetailPath(stream.code)}
                      className="photo-stream-selection-card-item"
                      aria-label={`${stream.name} Stream`}
                    >
                      <div className="photo-stream-selection-name">{stream.name}</div>
                      <div className="photo-stream-selection-code">Stream Code: {stream.code}</div>
                    </Link>
                  ))
                ) : (
                  // FORM I-IV standard streams
                  standardStreams.map((stream) => (
                    <Link
                      key={stream}
                      to={getStreamDetailPath(stream)}
                      className="photo-stream-selection-card-item"
                      aria-label={`Stream ${stream}`}
                    >
                      <div className="photo-stream-selection-name">Stream {stream}</div>
                    </Link>
                  ))
                )}
              </div>
              {isFormVOrVI && formVVIStreams.length > 0 && (
                <div className="photo-stream-selection-download-section">
                  <h3>Photo Entry Form — All Streams</h3>
                  <p>Download a combined printable form with student photos from every stream</p>
                  <div className="photo-stream-selection-download-controls">
                    <label className="photo-stream-selection-download-field">
                      <span>Year</span>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                      >
                        {availableYears.map((yearObj) => (
                          <option key={`${yearObj.year}-${yearObj.isEndYear ? 'end' : 'start'}`} value={yearObj.year}>
                            {yearObj.displayRange}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="photo-stream-selection-download-field">
                      <span>Term</span>
                      <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                      >
                        <option value="First Term">First Term (Jul-Dec)</option>
                        <option value="Second Term">Second Term (Jan-Jun)</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="photo-stream-selection-download-btn"
                    onClick={handleDownloadAllStreamsPhotoEntryForm}
                    disabled={downloadingAll}
                  >
                    <i className={`fas ${downloadingAll ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                    {downloadingAll ? 'Generating PDF...' : 'Download Photo Entry Form (All Streams)'}
                  </button>
                </div>
              )}
              <Link to={getBackPath()} className="photo-stream-selection-back-btn">
                <i className="fas fa-arrow-left"></i>
                <span>Back</span>
              </Link>
            </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PhotoStreamSelection;

