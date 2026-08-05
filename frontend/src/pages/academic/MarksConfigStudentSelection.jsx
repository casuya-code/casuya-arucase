/**
 * Marks Config Student Selection Page
 * Shows list of students after term selection - Matching Python Template
 */
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import './MarksConfigStudentSelection.css';

const MarksConfigStudentSelection = ({ formLevel }) => {
  const { year, stream, term } = useParams();

  // Normalize form level - convert to uppercase for database query
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';

  // Normalize stream: use 'A' as default for Form I-IV (previously 'NA')
  // For Form V/VI, use the actual stream value (e.g., "HKL", "PCM", etc.)
  const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
  const normalizedStream = stream || (isFormVOrVI ? '' : 'A');

  // Calculate if query should be enabled (must be explicit boolean)
  const isQueryEnabled = Boolean(
    normalizedLevel &&
    year &&
    (!isFormVOrVI || (normalizedStream && normalizedStream.trim() !== ''))
  );

  // Fetch students
  const { data: studentsData = [], isLoading, error: studentsError } = useQuery({
    queryKey: ['students', normalizedLevel, normalizedStream, year],
    queryFn: async () => {
      // Ensure we have valid parameters
      if (!normalizedLevel || !year) {
        console.warn('Missing required parameters:', { normalizedLevel, year });
        return [];
      }

      // For Form V/VI, stream is required
      if (isFormVOrVI && !normalizedStream) {
        console.warn('Form V/VI requires stream:', { normalizedLevel, normalizedStream });
        return [];
      }

      try {
        console.log('Fetching students with params:', {
          level: normalizedLevel,
          stream: normalizedStream,
          year: year
        });

        const res = await studentsAPI.getStudents({
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
          // For Form I-IV, don't filter by term - show all students for the year
          // For Form V/VI, filter by term
          ...(isFormVOrVI ? { term: term } : {}),
        });

        const students = res.data.students || [];
        console.log(`Found ${students.length} students for ${normalizedLevel} ${normalizedStream} ${year}`);

        // Sort alphabetically by first name, then middle name
        return students.sort((a, b) => {
          const firstNameA = String(a.first_name || '').toLowerCase().trim();
          const firstNameB = String(b.first_name || '').toLowerCase().trim();
          const firstNameCompare = firstNameA.localeCompare(firstNameB);
          if (firstNameCompare !== 0) return firstNameCompare;

          const middleNameA = String(a.middle_name || '').toLowerCase().trim();
          const middleNameB = String(b.middle_name || '').toLowerCase().trim();
          return middleNameA.localeCompare(middleNameB);
        });
      } catch (error) {
        // Only log non-401 errors to avoid spam
        if (error.response?.status !== 401) {
          console.error('Error fetching students:', error);
        }
        throw error;
      }
    },
    enabled: isQueryEnabled,
    retry: false, // Prevent repeated failed requests
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false, // Prevent refetch on focus to avoid race conditions
  });

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/marks-config/${formLevel}/stream/${stream}/year/${year}/terms`;
    } else {
      return `/admin/marks-config/${formLevel}/year/${year}/stream/${stream}/terms`;
    }
  };

  const getStudentMarksPath = (admNo) => {
    // Ensure term is properly encoded for URL (handles spaces like "Term I")
    const encodedTerm = term ? encodeURIComponent(term) : term;
    
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/marks-config/${formLevel}/stream/${stream}/year/${year}/term/${encodedTerm}/student/${admNo}`;
    } else {
      return `/admin/marks-config/${formLevel}/year/${year}/stream/${stream}/term/${encodedTerm}/student/${admNo}`;
    }
  };

  return (
    <AdminLayout>
      <div className="marks-config-student-selection-page-container">
        <div className="marks-config-student-selection-shell">
          <header className="marks-config-student-selection-top">
            <div>
              <h1 className="marks-config-student-selection-top-title">Registered Students</h1>
              <p className="marks-config-student-selection-top-sub">
                {normalizedLevel} {normalizedStream && normalizedStream !== 'A' ? `Stream ${normalizedStream}` : ''} &middot; {term} &middot; {year}
              </p>
            </div>
            <div className="marks-config-student-selection-actions">
              <Link to={getBackPath()} className="marks-config-student-selection-btn marks-config-student-selection-btn--secondary">
                <i className="fas fa-arrow-left"></i> Back to Terms
              </Link>
            </div>
          </header>

          {isLoading ? (
            <div className="marks-config-student-selection-state">
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: '#999' }} />
              <p>Loading students...</p>
            </div>
          ) : studentsError ? (
            <div className="marks-config-student-selection-state marks-config-student-selection-state--error">
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.5rem' }} />
              <h3>Error Loading Students</h3>
              <p>{studentsError.message || 'Failed to load students. Please try again.'}</p>
            </div>
          ) : studentsData.length === 0 ? (
            <div className="marks-config-student-selection-state">
              <i className="fas fa-users-slash" style={{ fontSize: '2rem', color: '#ccc' }} />
              <h3>No Students Found</h3>
              <p>No students have been registered for this class yet.</p>
              <Link
                to={`/admin/students/registration?level=${encodeURIComponent(normalizedLevel)}&stream=${encodeURIComponent(normalizedStream)}&year=${year}`}
                className="marks-config-student-selection-btn"
                style={{ marginTop: '1rem' }}
              >
                <i className="fas fa-plus"></i> Register Students
              </Link>
            </div>
          ) : (
            <div className="marks-config-student-selection-grid">
              {studentsData.map((student) => (
                <Link
                  key={student.adm_no}
                  to={getStudentMarksPath(student.adm_no)}
                  className="student-card"
                >
                  <div className="student-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="student-info">
                    <h4>{student.first_name} {student.middle_name} {student.surname}</h4>
                    <p className="student-adm">{student.adm_no}</p>
                    <p className="student-sex">{student.sex}</p>
                  </div>
                  <div className="student-arrow">
                    <i className="fas fa-chevron-right"></i>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarksConfigStudentSelection;
