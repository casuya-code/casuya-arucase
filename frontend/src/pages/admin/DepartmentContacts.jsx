/**
 * Site & department contacts — website_settings (phones, emails, URLs, hours)
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import { handleAdminSessionError } from '../../utils/adminSession';
import AdminLayout from '../../components/layout/AdminLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { adminAPI } from '../../services/admin';
import {
  EMPTY_SITE_CONTACT_FORM,
  SITE_CONTACT_FIELD_GROUPS,
  SITE_CONTACT_FIELDS_FLAT,
} from './departmentContactFields';
import './PublicWebsite.css';

function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUrl(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value.trim());
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function buildValidationErrors(data) {
  const nextErrors = {};
  SITE_CONTACT_FIELDS_FLAT.forEach((field) => {
    const value = (data[field.key] || '').trim();
    if (field.type === 'email' && !isValidEmail(value)) {
      nextErrors[field.key] = `${field.label} email is invalid`;
    }
    if (field.type === 'url' && !isValidUrl(value)) {
      nextErrors[field.key] = `${field.label} must be a valid http(s) URL`;
    }
  });
  return nextErrors;
}

const DepartmentContacts = () => {
  const queryClient = useQueryClient();
  const savedSnapshotRef = useRef(null);
  const [formData, setFormData] = useState(EMPTY_SITE_CONTACT_FORM);
  const [errors, setErrors] = useState({});

  const { data: contactsData, isLoading, error: contactsError } = useQuery({
    queryKey: ['admin-department-contacts'],
    queryFn: async () => {
      const res = await adminAPI.getDepartmentContacts();
      return res.data.contacts || {};
    },
    retry: (failureCount, error) => error?.response?.status !== 401 && failureCount < 1,
  });

  useEffect(() => {
    if (!contactsError) return;
    if (contactsError.response?.status === 401) {
      handleAdminSessionError(contactsError, 'Failed to load contacts');
    } else {
      toast.error(contactsError.response?.data?.message || 'Failed to load contacts');
    }
  }, [contactsError]);

  useEffect(() => {
    if (!contactsData) return;
    const next = { ...EMPTY_SITE_CONTACT_FORM, ...contactsData };
    setFormData(next);
    savedSnapshotRef.current = next;
  }, [contactsData]);

  const isDirty = useMemo(() => {
    if (!savedSnapshotRef.current) return false;
    return JSON.stringify(formData) !== JSON.stringify(savedSnapshotRef.current);
  }, [formData]);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: (data) => adminAPI.updateDepartmentContacts(data),
    onSuccess: (_response, variables) => {
      savedSnapshotRef.current = variables;
      queryClient.invalidateQueries({ queryKey: ['admin-department-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['homepage'] });
      toast.success('Site and department contacts saved.');
    },
    onError: (error) => {
      handleAdminSessionError(error, 'Failed to save contacts');
    },
  });

  const validateForm = (data) => {
    const nextErrors = buildValidationErrors(data);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm(formData)) {
      toast.error('Fix invalid fields before saving.');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleFieldChange = (key, value) => {
    const next = { ...formData, [key]: value };
    setFormData(next);
    if (errors[key]) {
      const nextErrors = buildValidationErrors(next);
      setErrors((prev) => {
        const updated = { ...prev };
        if (nextErrors[key]) updated[key] = nextErrors[key];
        else delete updated[key];
        return updated;
      });
    }
  };

  return (
    <AdminLayout>
      <div className="public-website-page-container">
        <div className="excel-card department-contacts-card">
          <div className="excel-card-header">
            <i className="fas fa-address-book" aria-hidden />
            <span className="admin-page-title">Site &amp; Department Contacts</span>
          </div>
          <div className="excel-card-body">
            <p className="admin-page-description department-contacts-intro">
              Phones, emails, office hours, social links, and footer text shown on the public
              website. Page prose is edited separately under Public Pages.
            </p>

            {isLoading ? (
              <div className="department-contacts-loading">
                <SkeletonLoader type="card" height="120px" />
                <SkeletonLoader type="card" height="120px" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="department-contacts-form">
                {SITE_CONTACT_FIELD_GROUPS.map((group) => (
                  <div key={group.title} className="form-section">
                    <h3>{group.title}</h3>
                    {group.description ? (
                      <p className="section-description">{group.description}</p>
                    ) : null}
                    {group.fields.map((field) => (
                      <div key={field.key} className="form-group">
                        <label htmlFor={field.key}>{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea
                            id={field.key}
                            value={formData[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className={`excel-input${errors[field.key] ? ' excel-input--invalid' : ''}`}
                            rows={3}
                            placeholder={field.placeholder || ''}
                            aria-invalid={Boolean(errors[field.key])}
                            aria-describedby={errors[field.key] ? `${field.key}-error` : undefined}
                          />
                        ) : (
                          <input
                            id={field.key}
                            type={field.type === 'url' ? 'url' : field.type}
                            value={formData[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className={`excel-input${errors[field.key] ? ' excel-input--invalid' : ''}`}
                            placeholder={field.placeholder || ''}
                            aria-invalid={Boolean(errors[field.key])}
                            aria-describedby={errors[field.key] ? `${field.key}-error` : undefined}
                          />
                        )}
                        {errors[field.key] ? (
                          <small id={`${field.key}-error`} className="field-error">
                            {errors[field.key]}
                          </small>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="form-actions department-contacts-form-actions">
                  {isDirty ? (
                    <span className="department-contacts-unsaved">Unsaved changes</span>
                  ) : null}
                  <button
                    type="submit"
                    className="excel-btn primary"
                    disabled={saveMutation.isPending || !isDirty}
                  >
                    <i className="fas fa-save" aria-hidden />
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DepartmentContacts;
