/**
 * Parish Stream Selection Page for FORM I-IV (after year selection)
 * or FORM V-VI (initial selection).
 * Non-admin users only see FORM V-VI streams (classes) allocated to them.
 */
import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useFormVVIStreams } from '../../hooks/useFormVVIStreams';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';
import './ParishStreamSelection.css';

const ParishStreamSelection = ({ formLevel, isFormVOrVI = false }) => {
  const { year } = useParams();
  const { hasClass, isAdminLike } = useAuth();
  const parishModule = { moduleId: 'student_parishes' };
  const standardStreams = ['A', 'B'];

  const formVVIStreams = useFormVVIStreams(formLevel, {
    requireAllocation: isFormVOrVI,
    moduleId: 'student_parishes',
  });

  const visibleStandardStreams = useMemo(() => {
    if (isFormVOrVI) return standardStreams;
    if (isAdminLike()) return standardStreams;
    return standardStreams.filter(() => hasClass(formLevel, parishModule));
  }, [isFormVOrVI, isAdminLike, formLevel, hasClass, standardStreams]);

  const formSlug = formLevelToPathSlug(formLevel);

  const getBackPath = () => {
    if (isFormVOrVI) {
      return '/admin/students/parishes';
    }
    return `/admin/students/parishes/${formSlug}/years`;
  };

  const getStreamDetailPath = (stream) => {
    if (isFormVOrVI) {
      return `/admin/students/parishes/${formSlug}/stream/${stream}/years`;
    }
    return `/admin/students/parishes/${formSlug}/year/${year}/stream/${stream}`;
  };

  return (
    <AdminLayout>
      <div className="parish-stream-selection-page-container">
        <div className="parish-stream-selection-card">
          <div className="parish-stream-selection-card-header">
            <i className="fas fa-place-of-worship"></i>
            <span>
              {formLevel} {year && `- ${year}`} - Select Stream
            </span>
          </div>
          <div className="parish-stream-selection-card-body">
            {isFormVOrVI && formVVIStreams.length === 0 ? (
              <p className="parish-stream-selection-empty">You do not have access to any streams for this form. Contact an administrator.</p>
            ) : (
            <>
              <div className="parish-stream-selection-grid">
                {isFormVOrVI ? (
                  formVVIStreams.map((stream) => (
                    <Link
                      key={stream.code}
                      to={getStreamDetailPath(stream.code)}
                      className="parish-stream-selection-card-item"
                      aria-label={`${stream.name} Stream`}
                    >
                      <div className="parish-stream-selection-name">{stream.name}</div>
                      <div className="parish-stream-selection-code">Stream Code: {stream.code}</div>
                    </Link>
                  ))
                ) : (
                  // FORM I-IV standard streams
                  visibleStandardStreams.map((stream) => (
                    <Link
                      key={stream}
                      to={getStreamDetailPath(stream)}
                      className="parish-stream-selection-card-item"
                      aria-label={`Stream ${stream}`}
                    >
                      <div className="parish-stream-selection-name">Stream {stream}</div>
                    </Link>
                  ))
                )}
              </div>
              <Link to={getBackPath()} className="parish-stream-selection-back-btn">
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

export default ParishStreamSelection;

