/**
 * Student Registration Landing Page
 * Shows FORM I-VI cards for navigation
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './StudentRegistration.css';

const StudentRegistration = () => {
  const forms = [
    { id: 'FORM I', label: 'FORM I', path: '/admin/students/registration/form-i/years', type: 'admissions' },
    { id: 'FORM II', label: 'FORM II', path: '/admin/students/registration/form-ii/years', type: 'admissions' },
    { id: 'FORM III', label: 'FORM III', path: '/admin/students/registration/form-iii/years', type: 'admissions' },
    { id: 'FORM IV', label: 'FORM IV', path: '/admin/students/registration/form-iv/years', type: 'admissions' },
    { id: 'FORM V', label: 'FORM V', path: '/admin/students/registration/form-v/streams', type: 'students' },
    { id: 'FORM VI', label: 'FORM VI', path: '/admin/students/registration/form-vi/streams', type: 'students' },
  ];

  return (
    <AdminLayout>
      <div className="registration-page-container">
        <div className="registration-card">
          <div className="registration-card-header">
            <i className="fas fa-layer-group"></i>
            <span>Classes</span>
          </div>
          <div className="registration-card-body">
            <div className="registration-grid">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={form.path}
                  className="registration-form-card"
                  data-form={form.id}
                  aria-label={`${form.id} ${form.type === 'admissions' ? 'Admissions' : 'Students'}`}
                >
                  <div className="registration-form-number">{form.id}</div>
                  <div className="registration-form-label">
                    {form.type === 'admissions' ? 'Admissions' : 'Students'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentRegistration;
