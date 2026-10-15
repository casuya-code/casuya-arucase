/**
 * Admission Letters — upload the PDFs shown on the homepage Udahili card.
 *  - Admission Application Form → homepage "Pakua Fomu ya Maombi"
 *  - Admission Pre-Form One     → homepage "Pakua Fomu ya Pre-Form One"
 */
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import {
  getAdmissionFormDownloadUrl,
  getAdmissionFormPreviewUrl,
  getAdmissionPreformDownloadUrl,
  getAdmissionPreformPreviewUrl,
} from '../../utils/backendUrl';
import './PublicWebsite.css';
import './AdmissionLetters.css';

const MAX_SIZE_MB = 15;

const AdmissionLetterSection = ({
  id,
  title,
  queryKey,
  getForm,
  upload,
  remove,
  getPreviewUrl,
  getDownloadUrl,
  defaultFilename,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const { data: formData, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await getForm();
      return res.data?.form || null;
    },
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const formDataUpload = new FormData();
      formDataUpload.append('pdf_file', file);
      return upload(formDataUpload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      queryClient.invalidateQueries({ queryKey: ['homepage'] });
      toast.success('PDF uploaded.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => remove(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
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

  const hasForm = Boolean(formData?.file_path);
  const pdfPreviewUrl = hasForm ? getPreviewUrl() : null;
  const pdfDownloadUrl = hasForm ? getDownloadUrl() : null;
  const filename = formData?.original_filename || defaultFilename;

  return (
    <section className="admission-letters-section" aria-labelledby={`${id}-heading`}>
      <div className="admission-letters-section__header">
        <h2 id={`${id}-heading`}>{title}</h2>
        <span
          className={`admission-letters-status ${hasForm ? 'admission-letters-status--live' : ''}`}
          role="status"
        >
          {hasForm ? 'Live' : 'Hidden'}
        </span>
      </div>

      {isLoading ? (
        <div className="admission-letters-grid admission-letters-grid--loading">
          <div className="admission-letters-card admission-letters-card--skeleton" aria-hidden />
          <div className="admission-letters-card admission-letters-card--skeleton" aria-hidden />
        </div>
      ) : (
        <div className="admission-letters-grid">
          <section className="admission-letters-card" aria-labelledby={`${id}-current-heading`}>
            <h3 id={`${id}-current-heading`}>Current PDF</h3>
            <div className="admission-letters-card__body">
              {hasForm ? (
                <div className="admission-letters-file">
                  <div className="admission-letters-file__icon" aria-hidden>
                    <i className="fas fa-file-pdf" />
                  </div>
                  <p className="admission-letters-file__name">{filename}</p>
                  <div className="admission-letters-file__actions">
                    <a
                      href={pdfPreviewUrl}
                      className="admin-btn admin-btn-blue admission-letters-action-btn"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fas fa-external-link-alt" aria-hidden />
                      Preview
                    </a>
                    <a
                      href={pdfDownloadUrl}
                      className="admin-btn admin-btn-secondary admission-letters-action-btn"
                      download={filename}
                    >
                      <i className="fas fa-download" aria-hidden />
                      Download
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

          <section className="admission-letters-card" aria-labelledby={`${id}-upload-heading`}>
            <h3 id={`${id}-upload-heading`}>{hasForm ? 'Replace' : 'Upload'}</h3>
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
    </section>
  );
};

const AdmissionLetters = () => (
  <AdminLayout>
    <div className="admission-letters-page">
      <header className="admission-letters-page__header">
        <h1>
          <i className="fas fa-file-pdf" aria-hidden />
          Admission Letters
        </h1>
      </header>

      <AdmissionLetterSection
        id="al-application"
        title="Admission Application Form"
        queryKey="admission-letters-form"
        getForm={adminAPI.getAdmissionLettersForm}
        upload={adminAPI.uploadAdmissionLettersForm}
        remove={adminAPI.deleteAdmissionLettersForm}
        getPreviewUrl={getAdmissionFormPreviewUrl}
        getDownloadUrl={getAdmissionFormDownloadUrl}
        defaultFilename="fomu-ya-maombi.pdf"
      />

      <AdmissionLetterSection
        id="al-preform"
        title="Admission Pre-Form"
        queryKey="admission-preform-letters-form"
        getForm={adminAPI.getAdmissionPreformLettersForm}
        upload={adminAPI.uploadAdmissionPreformLettersForm}
        remove={adminAPI.deleteAdmissionPreformLettersForm}
        getPreviewUrl={getAdmissionPreformPreviewUrl}
        getDownloadUrl={getAdmissionPreformDownloadUrl}
        defaultFilename="fomu-ya-pre-form-one.pdf"
      />
    </div>
  </AdminLayout>
);

export default AdmissionLetters;
