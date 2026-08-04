/**
 * Score Entry Subject Selection Page
 * Non-admin users only see subjects allocated to them.
 */
import { Link, useParams, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { studentsAPI } from '../../services/students';
import { normalizeFormVVITerm } from '../../utils/academicYearUtils';
import './ScoreEntrySubjectSelection.css';

const ScoreEntrySubjectSelection = ({ formLevel }) => {
  const { year, stream, term } = useParams();
  const { getAllowedSubjectsForClass, hasClass, isAdminLike } = useAuth();
  const decodedTerm = term ? decodeURIComponent(term) : '';
  
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';
  
  // Normalize stream: use 'A' as default for Form I-IV (previously 'NA')
  // Note: All "NA" stream values have been normalized to "A" in the database
  const normalizedStream = (() => {
    const streamValue = stream || 'A';
    // Normalize 'NA' to 'A' for Form I-IV
    if (streamValue.toUpperCase() === 'NA' && normalizedLevel && !normalizedLevel.includes('FORM V') && !normalizedLevel.includes('FORM VI')) {
      return 'A';
    }
    return streamValue;
  })();

  // Permission key: FORM I–IV use level only; FORM V/VI use "FORM V PCM" etc.
  const currentClassKey = (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI')
    ? `${normalizedLevel} ${normalizedStream}`
    : normalizedLevel;
  const allowedSubjectNames = getAllowedSubjectsForClass(currentClassKey);

  const { data: allSubjects = [], isLoading } = useQuery({
    queryKey: ['subjects', normalizedLevel, normalizedStream, year],
    queryFn: async () => {
      const res = await studentsAPI.getSubjects({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      return res.data.subjects || [];
    },
  });

  const subjects = useMemo(() => {
    if (allowedSubjectNames === null) return allSubjects;
    if (!Array.isArray(allowedSubjectNames) || allowedSubjectNames.length === 0) return [];
    const set = new Set(allowedSubjectNames.map((s) => String(s).trim()));
    return allSubjects.filter((s) => set.has(String(s.subject_name || '').trim()));
  }, [allSubjects, allowedSubjectNames]);

  if (!isAdminLike() && !hasClass(currentClassKey)) {
    return <Navigate to="/admin/score-entry" replace />;
  }

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/score-entry/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/score-entry/${formLevel}/years`;
    }
  };

  const getSubjectDetailPath = (subjectCode) => {
    // URL encode subject code to handle special characters like "/" in "A/PHY"
    const encodedSubjectCode = encodeURIComponent(subjectCode);
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      const termSlug = normalizeFormVVITerm(decodedTerm);
      return `/admin/score-entry/${formLevel}/stream/${stream}/year/${year}/term/${encodeURIComponent(termSlug)}/subject/${encodedSubjectCode}/months`;
    } else {
      return `/admin/score-entry/${formLevel}/year/${year}/stream/${stream}/subject/${encodedSubjectCode}/months`;
    }
  };

  return (
    <AdminLayout>
      <div className="score-entry-subject-selection-page-container">
        <div className="score-entry-subject-selection-card">
          <div className="score-entry-subject-selection-card-body">
            {isLoading ? (
              <div className="loading-state">Loading subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="score-entry-subject-selection-empty">
                <i className="fas fa-book-open empty-icon"></i>
                <h3>No Subjects Available</h3>
                <p>
                  {allowedSubjectNames !== null && Array.isArray(allowedSubjectNames) && allowedSubjectNames.length === 0
                    ? 'No subjects have been assigned to you for this class. Contact an administrator to set Class & Subject assignments.'
                    : 'No subjects have been added for this class yet. Please add subjects first.'}
                </p>
                {isAdminLike() && (
                  <Link to="/admin/subjects" className="score-entry-subject-selection-mgmt-btn">
                    <i className="fas fa-plus"></i> Manage Subjects
                  </Link>
                )}
              </div>
            ) : (
              <div className="stats-grid">
                {subjects.map((subject) => (
                  <Link
                    key={subject.subject_code}
                    to={getSubjectDetailPath(subject.subject_code)}
                    className="stat-card"
                  >
                    <div className="stat-icon">
                      <i className="fas fa-book"></i>
                    </div>
                    <div className="stat-content">
                      <h3>{subject.subject_name}</h3>
                      <p>{subject.subject_code} - {subject.subject_abbreviation || subject.subject_code}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link to={getBackPath()} className="score-entry-subject-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntrySubjectSelection;


