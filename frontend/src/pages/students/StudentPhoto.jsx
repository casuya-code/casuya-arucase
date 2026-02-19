/**
 * Student Photo Landing Page
 * Shows FORM I-VI cards for navigation
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './StudentPhoto.css';

const StudentPhoto = () => {
  const forms = [
    { id: 'FORM I', label: 'FORM I', path: '/admin/students/photos/form-i/years' },
    { id: 'FORM II', label: 'FORM II', path: '/admin/students/photos/form-ii/years' },
    { id: 'FORM III', label: 'FORM III', path: '/admin/students/photos/form-iii/years' },
    { id: 'FORM IV', label: 'FORM IV', path: '/admin/students/photos/form-iv/years' },
    { id: 'FORM V', label: 'FORM V', path: '/admin/students/photos/form-v/streams' },
    { id: 'FORM VI', label: 'FORM VI', path: '/admin/students/photos/form-vi/streams' },
  ];

  return (
    <AdminLayout>
      <div className="photo-page-container">
        <div className="photo-card">
          <div className="photo-card-header">
            <i className="fas fa-camera"></i>
            <span>Classes</span>
          </div>
          <div className="photo-card-body">
            <div className="photo-grid">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={form.path}
                  className="photo-form-card"
                  data-form={form.id}
                  aria-label={`${form.id} Student Photos`}
                >
                  <div className="photo-form-number">{form.id}</div>
                  <div className="photo-form-label">Student Photos</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentPhoto;

