/**
 * Subjects Management Landing Page
 * Shows FORM I-VI cards for navigation
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './Subjects.css';

const Subjects = () => {
  const forms = [
    { id: 'FORM I', label: 'FORM I', path: '/admin/subjects/form-i/years' },
    { id: 'FORM II', label: 'FORM II', path: '/admin/subjects/form-ii/years' },
    { id: 'FORM III', label: 'FORM III', path: '/admin/subjects/form-iii/years' },
    { id: 'FORM IV', label: 'FORM IV', path: '/admin/subjects/form-iv/years' },
    { id: 'FORM V', label: 'FORM V', path: '/admin/subjects/form-v/streams' },
    { id: 'FORM VI', label: 'FORM VI', path: '/admin/subjects/form-vi/streams' },
  ];

  return (
    <AdminLayout>
      <div className="subjects-page-container">
        <div className="subjects-card">
          <div className="subjects-card-header">
            <i className="fas fa-book"></i>
            <span>Classes</span>
          </div>
          <div className="subjects-card-body">
            <div className="subjects-grid">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={form.path}
                  className="subjects-form-card"
                  data-form={form.id}
                  aria-label={`${form.id} Subjects`}
                >
                  <div className="subjects-form-number">{form.id}</div>
                  <div className="subjects-form-label">Subjects</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Subjects;

