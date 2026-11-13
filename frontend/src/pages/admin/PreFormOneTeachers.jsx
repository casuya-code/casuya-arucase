import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import { useGoBack } from '../../hooks/useGoBack';
import preFormOneTeachersService from '../../services/preFormOneTeachersService';
import './PreFormOneContinuingSubjects.css';
import './preform-one-modern.css';

const PreFormOneTeachers = () => {
  const { year } = useParams();
  const goBack = useGoBack(`/admin/pre-form-one/${year}`);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    teacher_name: '',
    teacher_signature: '',
  });

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await preFormOneTeachersService.getTeachers(year);
      const list = Array.isArray(data?.data?.subjects)
        ? data.data.subjects
        : Array.isArray(data?.subjects)
        ? data.subjects
        : [];
      setSubjects(list);
    } catch (error) {
      toast.error('Error loading subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [year]);

  const openModal = (subject) => {
    setEditingSubject(subject);
    setFormData({
      teacher_name: subject.teacher_name || '',
      teacher_signature: subject.teacher_signature || '',
    });
  };

  const closeModal = () => {
    setEditingSubject(null);
    setFormData({ teacher_name: '', teacher_signature: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.teacher_name.trim()) {
      toast.error('Please enter teacher name');
      return;
    }
    try {
      setLoading(true);
      await preFormOneTeachersService.saveTeacher({
        year: parseInt(year, 10),
        subject_code: editingSubject.subject_code,
        teacher_name: formData.teacher_name,
        teacher_signature: formData.teacher_signature,
      });
      toast.success('Teacher assigned successfully!');
      closeModal();
      await loadSubjects();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subject) => {
    if (!window.confirm(`Remove teacher assignment for "${subject.subject_name}"?`)) return;
    try {
      setLoading(true);
      await preFormOneTeachersService.deleteTeacher(parseInt(year, 10), subject.subject_code);
      toast.success('Teacher assignment removed successfully!');
      await loadSubjects();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove teacher assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="continuing-subjects-page-container">
        <div className="continuing-subjects-page-header">
          <div className="continuing-subjects-page-title-block">
            <h2 className="continuing-subjects-page-heading">
              <i className="fas fa-chalkboard-teacher" aria-hidden="true"></i>
              Pre-Teachers
            </h2>
            <p className="continuing-subjects-page-subtitle">
              Academic Year: {year}
            </p>
          </div>
        </div>

        {loading && subjects.length === 0 ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <h3>Loading...</h3>
            <p>Please wait while we load the subjects.</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <h3>No Continuing Subjects Found</h3>
            <p>Add continuing subjects first.</p>
          </div>
        ) : (
          <div className="continuing-subjects-list-card">
            <div className="continuing-subjects-list-header">
              <h3>
                <i className="fas fa-list"></i>
                Continuing Subjects ({subjects.length})
              </h3>
            </div>
            <div className="continuing-subjects-table-container">
              <table className="continuing-subjects-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>S/N</th>
                    <th>Subject Name</th>
                    <th>Subject Code</th>
                    <th>Teacher&apos;s Name</th>
                    <th>Signature</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject, index) => (
                    <tr key={subject.id}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td>{subject.subject_name}</td>
                      <td>
                        <span className="teachers-tag">{subject.subject_code}</span>
                      </td>
                      <td>
                        {subject.teacher_name ? (
                          <span className="teachers-teacher-name">{subject.teacher_name}</span>
                        ) : (
                          <span className="teachers-no-teacher">Not Assigned</span>
                        )}
                      </td>
                      <td>
                        {subject.teacher_signature ? (
                          <span className="teachers-sig">{subject.teacher_signature}</span>
                        ) : (
                          <span className="teachers-no-teacher">&mdash;</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                          <button
                            onClick={() => openModal(subject)}
                            className="action-btn edit"
                            title="Assign Teacher"
                            disabled={loading}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {subject.teacher_name && (
                            <button
                              onClick={() => handleDelete(subject)}
                              className="action-btn delete"
                              title="Remove Teacher"
                              disabled={loading}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="back-navigation-bottom">
          <button type="button" onClick={goBack} className="back-button">
            <i className="fas fa-arrow-left"></i>
            Back
          </button>
        </div>

        {editingSubject && (
          <div
            className="modal-overlay"
            onClick={closeModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '8px',
                minWidth: '420px',
                maxWidth: '90vw',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
                Assign Teacher &mdash; {editingSubject.subject_name}
              </h3>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Teacher&apos;s Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.teacher_name}
                    onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                    required
                    placeholder="Enter teacher's full name"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Teacher Signature
                  </label>
                  <input
                    type="text"
                    value={formData.teacher_signature}
                    onChange={(e) => setFormData({ ...formData, teacher_signature: e.target.value })}
                    placeholder="Enter teacher's signature"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={closeModal} style={{ padding: '8px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PreFormOneTeachers;
