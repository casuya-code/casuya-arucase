/**
 * Individual Student Report - Step 4: Student Selection
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../services/api';
import './IndividualReport.css';

const IndividualReportStudentSelection = () => {
  const { form, stream, year, term } = useParams();
  const navigate = useNavigate();

  const apiYear = parseInt(year);

  const normalizedLevel = form
    ? form.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';

  const isFormVOrVI = normalizedLevel.toUpperCase() === 'FORM V' || normalizedLevel.toUpperCase() === 'FORM VI';

  const normalizeTerm = (termParam) => {
    if (!termParam) return 'Term I';
    const t = termParam.trim();
    if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t)) return 'First Term';
    if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t)) return 'Second Term';
    if (/^First\s+Term$/i.test(t)) return 'First Term';
    if (/^Second\s+Term$/i.test(t)) return 'Second Term';
    return t;
  };

  const normalizedTerm = normalizeTerm(term);

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['report-students', form, stream, apiYear, ...(isFormVOrVI ? [normalizedTerm] : [])],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('level', form);
      if (stream && stream !== 'NA') {
        params.append('stream', stream);
      }
      params.append('year', apiYear);
      if (isFormVOrVI) {
        params.append('term', normalizedTerm);
      }

      const res = await api.get(`/students?${params.toString()}`);
      return res.data.students || [];
    }
  });

  const handleStudentClick = (admNo) => {
    navigate(`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/${encodeURIComponent(term)}/${encodeURIComponent(admNo)}`);
  };

  return (
    <AdminLayout>
      <div className="individual-report-page">
        <div className="individual-report-shell">
          <div className="individual-report-breadcrumb">
            <Link to="/reports/individual">Individual Student Report</Link>
            <span className="bc-sep">&rsaquo;</span>
            <Link to="/reports/individual">{form}</Link>
            <span className="bc-sep">&rsaquo;</span>
            <Link to={`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/year`}>{year}</Link>
            <span className="bc-sep">&rsaquo;</span>
            <Link to={`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/term`}>{term}</Link>
            <span className="bc-sep">&rsaquo;</span>
            <span className="bc-current">Students</span>
          </div>

          <div className="individual-report-card" style={{ '--accent': '#06b6d4' }}>
            <div className="individual-report-card-header">
              <i className="fas fa-users" /> Select Student
            </div>
            <div className="individual-report-card-body">
              <p className="individual-report-instruction">
                Click on a student to generate their report
              </p>

              {isLoading ? (
                <div className="individual-report-loading">
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: '#999' }} />
                  <p>Loading students...</p>
                </div>
              ) : error ? (
                <div className="individual-report-error">
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.5rem' }} />
                  <p>Error loading students: {error.message}</p>
                </div>
              ) : students.length > 0 ? (
                <div className="individual-report-table-wrap">
                  <table className="individual-report-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>S/N</th>
                        <th style={{ width: '130px' }}>ADM NO</th>
                        <th>STUDENT NAME</th>
                        <th style={{ width: '130px' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => (
                        <tr key={student.id || student.adm_no}>
                          <td style={{ textAlign: 'center', color: '#999' }}>{index + 1}</td>
                          <td className="adm-no">{student.adm_no}</td>
                          <td className="student-name">
                            {student.first_name} {student.middle_name || ''} {student.surname}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleStudentClick(student.adm_no)}
                              className="individual-report-btn"
                              style={{ '--accent': '#06b6d4' }}
                            >
                              <i className="fas fa-file-alt" /> Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="individual-report-empty">
                  <i className="fas fa-inbox" />
                  <p>No students found for {form} {stream !== 'NA' ? stream : ''} {year}</p>
                </div>
              )}
              <div className="individual-report-actions">
                <Link
                  to={`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/term`}
                  className="individual-report-btn individual-report-btn--secondary"
                >
                  <i className="fas fa-arrow-left" /> Back to Terms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default IndividualReportStudentSelection;
