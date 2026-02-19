/**
 * Student Parishes Landing Page
 * Shows FORM I-VI cards for navigation
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './StudentParishes.css';

const StudentParishes = () => {
  const forms = [
    { id: 'FORM I', label: 'FORM I', path: '/admin/students/parishes/form-i/years' },
    { id: 'FORM II', label: 'FORM II', path: '/admin/students/parishes/form-ii/years' },
    { id: 'FORM III', label: 'FORM III', path: '/admin/students/parishes/form-iii/years' },
    { id: 'FORM IV', label: 'FORM IV', path: '/admin/students/parishes/form-iv/years' },
    { id: 'FORM V', label: 'FORM V', path: '/admin/students/parishes/form-v/streams' },
    { id: 'FORM VI', label: 'FORM VI', path: '/admin/students/parishes/form-vi/streams' },
  ];

  return (
    <AdminLayout>
      <div className="parish-page-container">
        <div className="parish-card">
          <div className="parish-card-header">
            <i className="fas fa-place-of-worship"></i>
            <span>Classes</span>
          </div>
          <div className="parish-card-body">
            <div className="parish-grid">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={form.path}
                  className="parish-form-card"
                  data-form={form.id}
                  aria-label={`${form.id} Student Parishes`}
                >
                  <div className="parish-form-number">{form.id}</div>
                  <div className="parish-form-label">Student Parishes</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentParishes;

