/**
 * Teachers Management Landing Page
 * Shows FORM I-VI cards for navigation
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './Teachers.css';

const Teachers = () => {
  const forms = [
    { id: 'FORM I', label: 'FORM I', path: '/admin/teachers/form-i/years', icon: 'fa-1' },
    { id: 'FORM II', label: 'FORM II', path: '/admin/teachers/form-ii/years', icon: 'fa-2' },
    { id: 'FORM III', label: 'FORM III', path: '/admin/teachers/form-iii/years', icon: 'fa-3' },
    { id: 'FORM IV', label: 'FORM IV', path: '/admin/teachers/form-iv/years', icon: 'fa-4' },
    { id: 'FORM V', label: 'FORM V', path: '/admin/teachers/form-v/streams', icon: 'fa-5' },
    { id: 'FORM VI', label: 'FORM VI', path: '/admin/teachers/form-vi/streams', icon: 'fa-6' },
  ];

  return (
    <AdminLayout>
      <div className="subject-teachers-page-container">
        <div className="subject-teachers-card">
          <div className="subject-teachers-card-header">
            <i className="fas fa-chalkboard-teacher"></i>
            <span>Classes</span>
          </div>
          <div className="subject-teachers-card-body">
            <div className="subject-teachers-grid">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={form.path}
                  className="subject-teachers-form-card"
                  data-form={form.id}
                  aria-label={`${form.id} Subject Teachers`}
                >
                  <div className="subject-teachers-form-number">{form.id}</div>
                  <div className="subject-teachers-form-label">Subject Teachers</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Teachers;
