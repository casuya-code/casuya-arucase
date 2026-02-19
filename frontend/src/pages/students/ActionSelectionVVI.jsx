/**
 * Action Selection Page for Form V-VI
 * Shows options: New Student and Registered Students
 * Uses special academic year logic for Form 5 & 6 streams
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { requiresSpecialAcademicYearLogic, getAcademicYearRange, getCurrentTerm, getApiYearForFormVVI } from '../../utils/academicYearUtils';
import './ActionSelection.css';

const ActionSelectionVVI = ({ formLevel }) => {
  const { stream, year } = useParams();
  
  // Get academic year information for Form V/VI
  // If year is an end year (e.g., 2026), get the academic year range for the start year (e.g., 2025)
  const apiYear = requiresSpecialAcademicYearLogic(formLevel) ? getApiYearForFormVVI(parseInt(year), formLevel) : parseInt(year);
  const academicYearInfo = requiresSpecialAcademicYearLogic(formLevel) ? getAcademicYearRange(apiYear) : null;
  const currentTermInfo = requiresSpecialAcademicYearLogic(formLevel) ? getCurrentTerm() : null;
  
  const formMap = {
    'FORM V': 'form-v',
    'FORM VI': 'form-vi',
  };
  
  const formPath = formMap[formLevel];
  
  const getBackPath = () => {
    return `/admin/students/registration/${formPath}/stream/${stream}/years`;
  };
  
  const getNewStudentPath = () => {
    return `/admin/students/registration/${formPath}/stream/${stream}/year/${year}`;
  };
  
  const getRegisteredStudentsPath = () => {
    // For Form V-VI, we can use the StudentList component with filters
    return `/students/list?level=${encodeURIComponent(formLevel)}&stream=${encodeURIComponent(stream)}&year=${year}`;
  };

  return (
    <AdminLayout>
      <div className="action-selection-page-container">
        <div className="action-selection-card">
          <div className="action-selection-card-header">
            <i className="fas fa-tasks"></i>
            <span>
              {formLevel} {stream} {year} - Select Action
              {academicYearInfo && (
                <span className="academic-year-info">
                  <br />
                  <small>Academic Year: ({academicYearInfo.displayRange})</small>
                  {currentTermInfo && (
                    <><br /><small>Current Term: {currentTermInfo.term}</small></>
                  )}
                </span>
              )}
            </span>
          </div>
          <div className="action-selection-card-body">
            <div className="action-selection-grid">
              <Link
                to={getNewStudentPath()}
                className="action-selection-card-item new-student"
                aria-label="Register New Student"
              >
                <div className="action-selection-icon">
                  <i className="fas fa-user-plus"></i>
                </div>
                <div className="action-selection-title">New Student</div>
                <div className="action-selection-description">
                  Register a new student for this class
                </div>
              </Link>
              
              <Link
                to={getRegisteredStudentsPath()}
                className="action-selection-card-item registered-students"
                aria-label="View Registered Students"
              >
                <div className="action-selection-icon">
                  <i className="fas fa-list"></i>
                </div>
                <div className="action-selection-title">Registered Students</div>
                <div className="action-selection-description">
                  View and manage registered students
                </div>
              </Link>
            </div>
            <Link to={getBackPath()} className="action-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ActionSelectionVVI;

