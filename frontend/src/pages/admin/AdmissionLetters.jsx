/**
 * Admission Letters — upload PDF application form shown on homepage Udahili card.
 */
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import { resolveStaticUrl } from '../../utils/backendUrl';
import './PublicWebsite.css';
import './AdmissionLetters.css';

const MAX_SIZE_MB = 15;

const AdmissionLetters = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const { data: formData, isLoading } = useQuery({
    queryKey: ['admission-letters-form'],
    queryFn: async () => {
      const res = await adminAPI.getAdmissionLettersForm();
      return res.data?.form || null;
    },
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const formDataUpload = new FormData();
      formDataUpload.append('pdf_file', file);
      return adminAPI.uploadAdmissionLettersForm(formDataUpload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-letters-form'] });
      queryClient.invalidateQueries({ queryKey: ['homepage'] });
      toast.success('PDF uploaded.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminAPI.deleteAdmissionLettersForm(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-letters-form'] });
      queryClient.invalidateQueries({ queryKey: ['homepage'] });
      toast.success('PDF removed.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Remove failed');
    },
  });

  const handleFileSelect = (file) => {
    if (!file) return;
    const ext = (file.name || '').toLowerCase().split('.').pop();
    if (ext !== 'pdf') {
      toast.error('PDF only.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Max ${MAX_SIZE_MB}MB`);
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer?.files?.[0]);
  };

  const pdfUrl = formData?.file_path ? resolveStaticUrl(formData.file_path) : null;
  const hasForm = Boolean(formData?.file_path);

  return (
    <AdminLayout>
      <div className="admission-letters-page">
        <header className="admission-letters-page__header">
          <h1>
            <i className="fas fa-file-pdf" aria-hidden />
            Admission Letters
          </h1>
          <span
            className={`admission-letters-status ${hasForm ? 'admission-letters-status--live' : ''}`}
            role="status"
          >
            {hasForm ? 'Live' : 'Hidden'}
          </span>
        </header>

        {isLoading ? (
          <div className="admission-letters-grid admission-letters-grid--loading">
            <div className="admission-letters-card admission-letters-card--skeleton" aria-hidden />
            <div className="admission-letters-card admission-letters-card--skeleton" aria-hidden />
          </div>
        ) : (
          <div className="admission-letters-grid">
            <section className="admission-letters-card" aria-labelledby="al-current-heading">
              <h2 id="al-current-heading">Current PDF</h2>
              <div className="admission-letters-card__body">
                {hasForm ? (
                  <div className="admission-letters-file">
                    <div className="admission-letters-file__icon" aria-hidden>
                      <i className="fas fa-file-pdf" />
                    </div>
                    <p className="admission-letters-file__name">
                      {formData.original_filename || 'application-form.pdf'}
                    </p>
                    <div className="admission-letters-file__actions">
                      <a
                        href={pdfUrl}
                        className="admin-btn admin-btn-blue admission-letters-action-btn"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="fas fa-external-link-alt" aria-hidden />
                        Preview
                      </a>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger admission-letters-action-btn"
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                      >
                        <i className="fas fa-trash" aria-hidden />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="admission-letters-empty">No PDF</p>
                )}
              </div>
            </section>

            <section className="admission-letters-card" aria-labelledby="al-upload-heading">
              <h2 id="al-upload-heading">{hasForm ? 'Replace' : 'Upload'}</h2>
              <div className="admission-letters-card__body">
                <div
                  className={`admission-letters-dropzone ${dragActive ? 'admission-letters-dropzone--active' : ''} ${uploadMutation.isPending ? 'admission-letters-dropzone--busy' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                  }}
                  onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!uploadMutation.isPending) fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={uploadMutation.isPending ? -1 : 0}
                  aria-disabled={uploadMutation.isPending}
                  aria-label="Upload PDF"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                    className="admission-letters-dropzone__input"
                    disabled={uploadMutation.isPending}
                  />
                  <i className="fas fa-cloud-upload-alt admission-letters-dropzone__icon" aria-hidden />
                  <p className="admission-letters-dropzone__label">
                    {uploadMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin" aria-hidden /> Uploading…
                      </>
                    ) : dragActive ? (
                      'Drop here'
                    ) : (
                      'Upload PDF'
                    )}
                  </p>
                  <p className="admission-letters-dropzone__hint">Max {MAX_SIZE_MB}MB</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdmissionLetters;
