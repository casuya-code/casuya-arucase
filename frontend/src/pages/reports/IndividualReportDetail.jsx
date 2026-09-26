/**
 * Individual Student Report - Step 5: Report Detail Display
 */
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { resolveStaticUrl } from '../../utils/backendUrl';
import {
  getAuthoritySignatureImageUrl,
  getAuthoritySignatureText,
} from '../../utils/authoritySignature';
import { formatReportScore, formatReportWeightPercent } from '../../utils/reportScoreFormat';
import {
  REPORT_TRAIT_CODES,
  getReportDictionary,
  getMonthAbbreviation,
  getGradeComment,
  getTraitDescription,
  getMarksLegend,
  isALevelForm,
  normalizeReportLanguage,
} from '../../utils/reportLang';
import './IndividualReport.css';
import './IndividualReportDetail.css';

const IndividualReportDetail = () => {
  const { form, stream, year, term, admNo } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  // The report language follows ?lang=... so an English report can be linked to
  // and bookmarked directly. Default stays Swahili.
  const reportLang = normalizeReportLanguage(searchParams.get('lang'));
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingEnglish, setIsDownloadingEnglish] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [imageErrors, setImageErrors] = useState({
    schoolLogo: false,
    studentPhoto: false,
    signatureImage: false,
    stampImage: false
  });
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const t = getReportDictionary(reportLang);

  const setReportLang = (nextLang) => {
    const params = new URLSearchParams(searchParams);
    if (normalizeReportLanguage(nextLang) === 'en') {
      params.set('lang', 'en');
    } else {
      params.delete('lang');
    }
    setSearchParams(params, { replace: true });
  };

  // Fetch report data
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['report-detail', form, stream, year, term, admNo],
    queryFn: async () => {
      try {
        // Authentication now uses httpOnly cookies - no localStorage token check needed
        const res = await api.get(
          `/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream || '')}/${encodeURIComponent(year)}/${encodeURIComponent(term)}/${encodeURIComponent(admNo)}`
        );
        if (!res.data) {
          throw new Error('No data received from server');
        }
        return res.data;
      } catch (err) {
        console.error('Error fetching report data:', err);
        
        // Handle authentication errors
        if (err.response?.status === 401) {
          const errorMessage = err.response.data?.message || 'Authentication required';
          const isTokenExpired = errorMessage.toLowerCase().includes('expired') || 
                                errorMessage.toLowerCase().includes('token expired');
          
          if (isTokenExpired) {
            toast.error('Your session has expired. Please log in again.');
            // Redirect to login after a short delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          } else {
            toast.error('Authentication required. Please log in again.');
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
          throw new Error(errorMessage);
        }
        
        if (err.response) {
          const errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
          toast.error(errorMessage);
          throw new Error(errorMessage);
        } else if (err.request) {
          const errorMessage = 'Network error: Could not connect to server';
          toast.error(errorMessage);
          throw new Error(errorMessage);
        } else {
          const errorMessage = err.message || 'Failed to fetch report data';
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnWindowFocus: false
  });

  // Extract data from reportData when available
  const { 
    student, 
    subjects, 
    monthly_results, 
    comments, 
    tabia_mwenendo, 
    subject_rankings,
    subject_teacher_signatures,
    overall_rank,
    total_students,
    marks_config,
    months: reportMonths,
    summary_data,
    student_parish,
    student_fees_debt,
    class_fees_announcements,
    school_logo,
    school_stamp,
    authority_data
  } = reportData || {};

  const getStudentPhotoUrl = (photoPath) => resolveStaticUrl(photoPath || '');

  // Reset image errors when report data changes
  useEffect(() => {
    if (reportData) {
      setImageErrors({
        schoolLogo: false,
        studentPhoto: false,
        signatureImage: false,
        stampImage: false
      });
    }
  }, [reportData]);

  // Downloads the report PDF in the requested language. The current page
  // language is used by default; the "Download English Report" button passes 'en'.
  const handleDownloadPDF = async (targetLang = reportLang) => {
    const language = normalizeReportLanguage(targetLang);
    const isEnglish = language === 'en';

    if (isEnglish ? isDownloadingEnglish : isDownloading) return; // Prevent multiple simultaneous downloads
    if (isDownloading || isDownloadingEnglish) return;

    if (isEnglish) {
      setIsDownloadingEnglish(true);
    } else {
      setIsDownloading(true);
    }
    setDownloadProgress(0);
    
    let blobUrl = null;
    
    try {
      // Show initial progress
      setDownloadProgress(0);
      
      // Encode parameters for URL
      const encodedForm = encodeURIComponent(form);
      const encodedStream = encodeURIComponent(stream || '');
      const encodedTerm = encodeURIComponent(term);
      
      // Make request with timeout and progress tracking
      const encodedAdm = encodeURIComponent(admNo || '');
      const res = await api.get(
        `/reports/individual/${encodedForm}/${encodedStream}/${year}/${encodedTerm}/${encodedAdm}/pdf?lang=${language}`,
        { 
          responseType: 'blob',
          timeout: 60000, // 60 second timeout
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.lengthComputable && progressEvent.total && progressEvent.total > 0) {
              // Calculate actual percentage from 0% to 90% (download phase)
              const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total) * 90);
              setDownloadProgress(Math.min(percentCompleted, 90));
            } else if (progressEvent.loaded > 0) {
              // If we have loaded bytes but no total, estimate progress
              // Assume average PDF is around 200KB, scale accordingly
              const estimatedTotal = 200 * 1024; // 200KB estimate
              const percentCompleted = Math.round((progressEvent.loaded / estimatedTotal) * 90);
              setDownloadProgress(Math.min(percentCompleted, 90));
            } else {
              // Fallback: simulate progress incrementally
              setDownloadProgress(prev => {
                if (prev < 90) {
                  return Math.min(prev + 2, 90);
                }
                return prev;
              });
            }
          }
        }
      );
      
      setDownloadProgress(90);
      
      // Validate response
      if (!res.data) {
        throw new Error('No data received from server');
      }
      
      // Check if response is actually a PDF blob
      let blob;
      if (res.data instanceof Blob) {
        // Check content type
        if (res.data.type && !res.data.type.includes('application/pdf')) {
          // Might be an error JSON wrapped in blob
          const text = await res.data.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || 'Error generating PDF');
          } catch (parseError) {
            throw new Error('Invalid PDF file received from server');
          }
        }
        blob = res.data;
      } else {
        // Fallback: create blob from data
        blob = new Blob([res.data], { type: 'application/pdf' });
      }
      
      // Validate blob size (should be reasonable for a PDF - at least 1KB)
      if (blob.size < 1000) {
        // Check if it's an error message
        if (blob.size < 500) {
          const text = await blob.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || 'Error generating PDF');
          } catch {
            throw new Error('PDF file appears to be corrupted or empty');
          }
        }
        throw new Error('PDF file appears to be corrupted or empty');
      }
      
      // Create download URL
      blobUrl = window.URL.createObjectURL(blob);
      
      // Generate filename with proper formatting
      const sanitizedTerm = term.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const sanitizedForm = form.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const filename = `Report_${isEnglish ? 'English_' : ''}${admNo}_${sanitizedForm}_${year}_${sanitizedTerm}.pdf`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        if (blobUrl) {
          window.URL.revokeObjectURL(blobUrl);
        }
      }, 100);
      
      setDownloadProgress(100);
      
      // Success notification
      toast.success(`${isEnglish ? 'English' : 'PDF'} downloaded successfully! (${(blob.size / 1024).toFixed(1)} KB)`, {
        autoClose: 3000,
      });
      
    } catch (error) {
      console.error('PDF Download Error:', error);
      
      let errorMessage = 'Error downloading PDF';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 401) {
          const authMessage = error.response.data?.message || 'Authentication required';
          const isTokenExpired = authMessage.toLowerCase().includes('expired') || 
                                authMessage.toLowerCase().includes('token expired');
          
          if (isTokenExpired) {
            errorMessage = 'Your session has expired. Please log in again.';
            toast.error(errorMessage, { autoClose: 3000 });
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          } else {
            errorMessage = 'Authentication required. Please log in again.';
            toast.error(errorMessage, { autoClose: 3000 });
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
        } else if (error.response.status === 404) {
          errorMessage = 'Report not found. Please verify the student information.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error generating PDF. Please try again later.';
        } else if (error.response.status === 403) {
          errorMessage = 'Permission denied. You may not have access to download this report.';
        } else {
          errorMessage = `Download failed: ${error.response.status} ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        // Error in request setup or other error
        errorMessage = error.message;
      }
      
      if (error.response?.status !== 401) {
        toast.error(errorMessage, {
          autoClose: 5000,
        });
      }
      
    } finally {
      // Cleanup blob URL if it exists
      if (blobUrl) {
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
      
      if (isEnglish) {
        setIsDownloadingEnglish(false);
      } else {
        setIsDownloading(false);
      }
      setTimeout(() => setDownloadProgress(0), 500);
    }
  };

  // Initialize report formatting utilities on mount and when data changes
  // MUST be called before early returns to follow Rules of Hooks
  useEffect(() => {
    if (!reportData) return;

    // Force MAONI column visibility
    const forceMaoniColumnVisible = () => {
      const maoniHeaders = document.querySelectorAll('.academic-table th:nth-child(10)');
      const maoniCells = document.querySelectorAll('.academic-table td:nth-child(10)');
      
      maoniHeaders.forEach((header) => {
        header.style.display = 'table-cell';
        header.style.visibility = 'visible';
        header.style.opacity = '1';
        header.style.border = '1px solid #000000';
      });
      
      maoniCells.forEach((cell) => {
        cell.style.display = 'table-cell';
        cell.style.visibility = 'visible';
        cell.style.opacity = '1';
        cell.style.border = '1px solid #000000';
      });
    };

    // Force thin black borders on all table cells
    const forceThinBlackBorders = () => {
      const allTableCells = document.querySelectorAll('.report-container td, .report-container th');
      allTableCells.forEach((cell) => {
        cell.style.border = '1px solid #000000';
      });
    };

    // Force column widths
    const forceColumnWidths = () => {
      const academicTable = document.querySelector('.academic-table');
      if (!academicTable) return;

      academicTable.style.setProperty('table-layout', 'fixed', 'important');
      academicTable.style.setProperty('width', '100%', 'important');

      // Column widths - ensure all 10 columns are properly sized
      const colWidths = ['33%', '7%', '7%', '7%', '7%', '5%', '4%', '4%', '12%', '14%'];
      colWidths.forEach((width, idx) => {
        const col = academicTable.querySelectorAll(`th:nth-child(${idx + 1}), td:nth-child(${idx + 1})`);
        col.forEach(cell => {
          cell.style.setProperty('width', width, 'important');
          cell.style.setProperty('min-width', width, 'important');
          cell.style.setProperty('max-width', width, 'important');
        });
      });
      
      // CRITICAL: Force rotation for NAFASI header (column 8) - ensure it rotates in PDF
      const nafasiHeader = academicTable.querySelector('thead tr:first-child th:nth-child(8).rotate-header');
      if (nafasiHeader) {
        nafasiHeader.style.setProperty('writing-mode', 'vertical-rl', 'important');
        nafasiHeader.style.setProperty('text-orientation', 'mixed', 'important');
        nafasiHeader.style.setProperty('transform', 'rotate(180deg)', 'important');
        nafasiHeader.style.setProperty('-webkit-transform', 'rotate(180deg)', 'important');
        nafasiHeader.style.setProperty('-moz-transform', 'rotate(180deg)', 'important');
        nafasiHeader.style.setProperty('-ms-transform', 'rotate(180deg)', 'important');
        nafasiHeader.style.setProperty('white-space', 'nowrap', 'important');
        nafasiHeader.style.setProperty('text-align', 'center', 'important');
        nafasiHeader.style.setProperty('vertical-align', 'middle', 'important');
      }
      
      // Specifically ensure SAHIHI YA MWALIMU stays in column 10
      const sahihiHeaders = academicTable.querySelectorAll('thead tr:first-child th.sahihi-header, thead tr:first-child th:nth-child(10)');
      sahihiHeaders.forEach(header => {
        header.style.setProperty('width', '14%', 'important');
        header.style.setProperty('min-width', '14%', 'important');
        header.style.setProperty('max-width', '14%', 'important');
        header.style.setProperty('display', 'table-cell', 'important');
      });
      
      const sahihiCells = academicTable.querySelectorAll('tbody td:nth-child(10), thead tr th:nth-child(10)');
      sahihiCells.forEach(cell => {
        cell.style.setProperty('width', '14%', 'important');
        cell.style.setProperty('min-width', '14%', 'important');
        cell.style.setProperty('max-width', '14%', 'important');
      });
    };
    
    // Force NAFASI header rotation - critical for PDF generation
    const forceNafasiRotation = () => {
      const academicTable = document.querySelector('.academic-table');
      if (!academicTable) return;
      
      // Find NAFASI header (column 8 with rotate-header class)
      const nafasiHeader = academicTable.querySelector('thead tr:first-child th:nth-child(8).rotate-header');
      if (nafasiHeader) {
        // Apply rotation with all vendor prefixes for maximum compatibility
        nafasiHeader.style.setProperty('writing-mode', 'vertical-rl', 'important');
        nafasiHeader.style.setProperty('text-orientation', 'mixed', 'important');
        nafasiHeader.style.setProperty('transform', 'rotate(180deg)', 'important');
        nafasiHeader.style.setProperty('-webkit-transform', 'rotate(180deg)', 'important');
        nafasiHeader.style.setProperty('-moz-transform', 'rotate(180deg)', 'important');
        nafasiHeader.style.setProperty('-ms-transform', 'rotate(180deg)', 'important');
        nafasiHeader.style.setProperty('-o-transform', 'rotate(180deg)', 'important');
        nafasiHeader.style.setProperty('white-space', 'nowrap', 'important');
        nafasiHeader.style.setProperty('text-align', 'center', 'important');
        nafasiHeader.style.setProperty('vertical-align', 'middle', 'important');
        nafasiHeader.style.setProperty('display', 'table-cell', 'important');
        nafasiHeader.style.setProperty('position', 'relative', 'important');
        
        if (import.meta.env.DEV) {
          console.log('[Report] NAFASI header rotation forced:', {
            element: nafasiHeader,
            computedStyle: window.getComputedStyle(nafasiHeader).transform,
            writingMode: window.getComputedStyle(nafasiHeader).writingMode
          });
        }
      }
    };

    // Initialize formatting
    const initFormatting = () => {
      forceMaoniColumnVisible();
      forceThinBlackBorders();
      forceColumnWidths();
      // Force NAFASI rotation on initialization
      forceNafasiRotation();
    };

    // Run immediately
    initFormatting();

    // Use MutationObserver to watch for style changes
    const academicTable = document.querySelector('.academic-table');
    let observer = null;
    if (academicTable) {
      observer = new MutationObserver(() => {
        setTimeout(initFormatting, 10);
      });

      observer.observe(academicTable, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: true
      });
    }

    // Re-run on window resize
    const handleResize = () => initFormatting();
    window.addEventListener('resize', handleResize);

    // Convert logo to data URL before print to ensure it prints
    const convertLogoToDataUrl = () => {
      if (school_logo?.logo_image_path && !logoDataUrl) {
        let logoUrl;
        
        // If logo_image_path is already a Cloudinary URL, use it directly
        if (school_logo.logo_image_path.startsWith('http')) {
          logoUrl = school_logo.logo_image_path;
        } else {
          logoUrl = resolveStaticUrl(school_logo.logo_image_path);
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setLogoDataUrl(dataUrl);
          } catch (err) {
            // Silently handle CORS/security errors - image will still display, just won't be in PDF
            if (import.meta.env.DEV && !err.message.includes('Tainted')) {
              console.warn('[Report] Could not convert logo to data URL:', err.message);
            }
          }
        };
        img.onerror = () => {
          if (import.meta.env.DEV) {
            console.warn('[Report] Error loading logo for print conversion');
          }
        };
        img.src = logoUrl;
      }
    };

    // Re-run before print
    const handleBeforePrint = () => {
      initFormatting();
      convertLogoToDataUrl();
      // CRITICAL: Force NAFASI rotation right before printing
      forceNafasiRotation();
      
      // CRITICAL: Force grade key to be visible before PDF generation
      const gradeKeyLegend = document.querySelector('.grade-key-legend');
      if (gradeKeyLegend) {
        gradeKeyLegend.style.setProperty('display', 'block', 'important');
        gradeKeyLegend.style.setProperty('visibility', 'visible', 'important');
        gradeKeyLegend.style.setProperty('opacity', '1', 'important');
        gradeKeyLegend.style.setProperty('color', '#000000', 'important');
        
        // Force all child divs to be visible
        const childDivs = gradeKeyLegend.querySelectorAll('div');
        childDivs.forEach(div => {
          div.style.setProperty('display', 'block', 'important');
          div.style.setProperty('visibility', 'visible', 'important');
          div.style.setProperty('opacity', '1', 'important');
          div.style.setProperty('color', '#000000', 'important');
        });
        
        // Force all strong tags to be visible
        const strongTags = gradeKeyLegend.querySelectorAll('strong');
        strongTags.forEach(strong => {
          strong.style.setProperty('display', 'inline', 'important');
          strong.style.setProperty('visibility', 'visible', 'important');
          strong.style.setProperty('opacity', '1', 'important');
          strong.style.setProperty('color', '#000000', 'important');
          strong.style.setProperty('font-weight', 'bold', 'important');
        });
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    
    // Also convert logo when data is available
    if (school_logo?.logo_image_path) {
      convertLogoToDataUrl();
    }

    // Cleanup
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [reportData]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="loading">Loading report...</div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="error" style={{ padding: '20px', textAlign: 'center' }}>
          <h3>Error loading report</h3>
          <p>{error.message}</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Please check:
            <br />- Student admission number: {admNo}
            <br />- Form: {form}
            <br />- Stream: {stream}
            <br />- Year: {year}
            <br />- Term: {term}
          </p>
          <Link to="/reports/individual" style={{ marginTop: '20px', display: 'inline-block' }}>
            <button type="button">Back to Report Selection</button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  if (!reportData) {
    return (
      <AdminLayout>
        <div className="error">No report data available</div>
      </AdminLayout>
    );
  }

  const formCode = form.replace('FORM ', '').replace('FORM', '').trim();
  const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode) || 
                      (form && (form.toUpperCase().includes('V') && !form.toUpperCase().includes('IV')));
  const months = reportMonths || ['February', 'May', 'August', 'November'];

  // Calculate grades based on form level
  const getGrade = (total) => {
    if (isForm5Or6) {
      // A-Level grading: A=85+, B=75+, C=65+, D=55+, E=45+, S=40+, F=<40
      if (total >= 85) return 'A';
      if (total >= 75) return 'B';
      if (total >= 65) return 'C';
      if (total >= 55) return 'D';
      if (total >= 45) return 'E';
      if (total >= 40) return 'S';
      return 'F';
    } else {
      // O-Level grading: A=85+, B=70+, C=55+, D=40+, F=<40
      if (total >= 85) return 'A';
      if (total >= 70) return 'B';
      if (total >= 55) return 'C';
      if (total >= 40) return 'D';
      return 'F';
    }
  };

  const getComment = (grade) =>
    getGradeComment(reportLang, grade, { isALevel: isALevelForm(form) });

  // Process monthly results
  // Scores may be stored with either subject_code or subject_abbreviation
  // Create entries for both to ensure we can find scores regardless of which key is used
  const processMonthlyResults = () => {
    const monthlyData = {};
    monthly_results?.forEach((result) => {
      const subjectKey = result.subject_code;
      if (!monthlyData[subjectKey]) {
        monthlyData[subjectKey] = {};
      }
      monthlyData[subjectKey][result.month] = result.score || 0;
    });
    return monthlyData;
  };

  const monthlyData = processMonthlyResults();
  
  // Use summary data from backend if available
  const summary = summary_data || {
    total_marks: '0',
    average: '0',
    grade: 'F',
    division: 'IV',
    division_point: '0',
    position: overall_rank?.toString() || '-',
    total_students: total_students?.toString() || '-'
  };
  
  // Get month label helper
  const getMonthLabel = (month) => getMonthAbbreviation(month, isForm5Or6);

  // Get tabia mwenendo evaluations - convert array to dictionary format like copy
  const studentEvaluations = {};
  if (tabia_mwenendo && Array.isArray(tabia_mwenendo)) {
    tabia_mwenendo.forEach((t) => {
      const code = String(t.criterion ?? t.code ?? '').trim();
      if (code) {
        studentEvaluations[code] = t.evaluation || t.grade || 'C';
      }
    });
  }
  
  const getTabiaEvaluation = (code) => {
    return studentEvaluations[code] || 'C';
  };

  // Get comments - match copy implementation which uses _comments suffix
  // Convert comments array to dictionary format like copy
  // Database stores comment_type as 'mwalimu_taaluma', template expects 'mwalimu_taaluma_comments'
  const studentComments = {};
  if (comments && Array.isArray(comments)) {
    comments.forEach((c) => {
      if (c.comment_type) {
        // Map database comment_type (without _comments) to template key (with _comments)
        const templateKey = `${c.comment_type}_comments`;
        studentComments[templateKey] = c.comment_text || '';
        // Also store original key for backward compatibility
        studentComments[c.comment_type] = c.comment_text || '';
      }
    });
  }
  
  const getCommentValue = (key) => {
    // Copy implementation uses _comments suffix
    const commentKey = key.includes('_comments') ? key : `${key}_comments`;
    return studentComments[commentKey] || studentComments[key] || '';
  };

  // Format authority date
  const formatAuthorityDate = () => {
    if (authority_data?.date) {
      try {
        // Try parsing YYYY-MM-DD format
        const dateObj = new Date(authority_data.date);
        if (!isNaN(dateObj.getTime())) {
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          return `${day}/${month}/${year}`;
        }
      } catch (e) {
        // If parsing fails, return as is
      }
      return authority_data.date;
    }
    return new Date().toLocaleDateString('en-GB');
  };

  const authoritySignatureImageUrl = getAuthoritySignatureImageUrl(authority_data);
  const authoritySignatureText = getAuthoritySignatureText(authority_data);
  const showAuthoritySignatureImage =
    Boolean(authoritySignatureImageUrl) && !imageErrors.signatureImage;

  // Get student huduma (service assignment) - match copy implementation
  // Copy uses student_comments.get('huduma_comments', '')
  const studentHuduma = studentComments['huduma_comments'] || studentComments['huduma'] || '';

  // Process class fees announcements
  const classFeesAnnouncements = class_fees_announcements || {};

  return (
    <AdminLayout>
      <div className="report-container" data-version="2.0">
        <div className="breadcrumb">
          <Link to="/reports/individual">{t.pageTitle}</Link> &gt;{' '}
          <Link to={`/reports/individual/${form}/${stream}/year`}>{form}</Link> &gt;{' '}
          <Link to={`/reports/individual/${form}/${stream}/${year}/term`}>{year}</Link> &gt;{' '}
          <Link to={`/reports/individual/${form}/${stream}/${year}/${term}/students`}>
            {term}
          </Link>{' '}
          &gt; {admNo}
        </div>

        <div className="download-section" style={{ marginTop: '16px', textAlign: 'center' }}>
          <div className="report-language-toggle" role="group" aria-label={t.languageLabel}>
            <span className="report-language-toggle-label">{t.languageLabel}:</span>
            <button
              type="button"
              onClick={() => setReportLang('sw')}
              className={`report-language-btn ${reportLang === 'sw' ? 'active' : ''}`}
              aria-pressed={reportLang === 'sw'}
            >
              {t.languageSwahili}
            </button>
            <button
              type="button"
              onClick={() => setReportLang('en')}
              className={`report-language-btn ${reportLang === 'en' ? 'active' : ''}`}
              aria-pressed={reportLang === 'en'}
            >
              {t.languageEnglish}
            </button>
          </div>
          <div className="download-buttons">
            <button
              type="button"
              onClick={() => handleDownloadPDF(reportLang)}
              className="download-btn"
              disabled={isDownloading || isDownloadingEnglish || isLoading || !reportData}
              title={isDownloading ? t.downloadingPdf : t.downloadPdf}
            >
              {isDownloading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {t.downloadingPdf} {downloadProgress > 0 && `${downloadProgress}%`}
                </>
              ) : (
                <>
                  <i className="fas fa-file-pdf"></i>
                  {t.downloadPdf}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadPDF('en')}
              className="download-btn download-btn-english"
              disabled={isDownloading || isDownloadingEnglish || isLoading || !reportData}
              title={isDownloadingEnglish ? t.downloadingEnglish : t.downloadEnglish}
            >
              {isDownloadingEnglish ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {t.downloadingEnglish} {downloadProgress > 0 && `${downloadProgress}%`}
                </>
              ) : (
                <>
                  <i className="fas fa-file-pdf"></i>
                  {t.downloadEnglish}
                </>
              )}
            </button>
          </div>
          {(isDownloading || isDownloadingEnglish) && downloadProgress > 0 && (
            <div className="download-progress-bar">
              <div 
                className="download-progress-fill" 
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Header Section */}
        <div className="report-header" style={{ marginBottom: '0' }}>
          <div className="logo-section">
            {school_logo?.logo_image_path ? (
              <img
                src={
                  logoDataUrl ||
                  (school_logo.logo_image_path.startsWith('http')
                    ? school_logo.logo_image_path
                    : resolveStaticUrl(school_logo.logo_image_path))
                }
                alt="Arusha Catholic Seminary official school logo"
                className="school-logo"
                crossOrigin="anonymous"
                loading="eager"
                onError={(e) => {
                  console.error('[Report] Logo image load error:', e.target.src);
                  e.target.style.display = 'none';
                  setImageErrors(prev => ({ ...prev, schoolLogo: true }));
                }}
                onLoad={(e) => {
                  // Ensure image is loaded before print - convert to data URL
                  if (!logoDataUrl) {
                    const img = e.target;
                    try {
                      // Check if image is from same origin or has CORS headers
                      const canvas = document.createElement('canvas');
                      canvas.width = img.naturalWidth || img.width;
                      canvas.height = img.naturalHeight || img.height;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img, 0, 0);
                      const dataUrl = canvas.toDataURL('image/png');
                      setLogoDataUrl(dataUrl);
                    } catch (err) {
                      // Silently handle CORS errors - image will still display, just won't be in PDF
                      if (import.meta.env.DEV) {
                        console.warn('[Report] Could not convert logo to data URL (CORS or security restriction):', err.message);
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="school-logo-placeholder">
                <i className="fas fa-school"></i>
              </div>
            )}
          </div>
          <div className="school-info">
            <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
            <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
            <div className="contact-info">
              <p>P.O BOX 3102 Arusha, Tanzania</p>
              <p>+255 754 92 60 22 / +255 765 394 802 (Office)</p>
              <p>Email: arucase@gmail.com</p>
            </div>
          </div>
          <div className="student-photo">
            {student?.photo_path ? (
              <img
                src={photoDataUrl || getStudentPhotoUrl(student.photo_path)}
                alt={`${student.first_name || ''} ${student.surname || ''}`}
                className="photo"
                loading="eager"
                crossOrigin="anonymous"
                onError={(e) => {
                  if (import.meta.env.DEV) {
                    console.warn('[Report] Student photo load error:', e.target.src);
                    console.warn('[Report] Student photo_path:', student.photo_path);
                  }
                  e.target.style.display = 'none';
                  setImageErrors(prev => ({ ...prev, studentPhoto: true }));
                  // Show placeholder when image fails
                  const placeholder = e.target.parentElement.querySelector('.photo-placeholder');
                  if (placeholder) {
                    placeholder.style.display = 'flex';
                  }
                }}
                onLoad={(e) => {
                  // Hide placeholder when image loads successfully
                  const placeholder = e.target.parentElement.querySelector('.photo-placeholder');
                  if (placeholder) {
                    placeholder.style.display = 'none';
                  }
                  // Reset error state on successful load
                  setImageErrors(prev => ({ ...prev, studentPhoto: false }));
                  // Convert to data URL for print (similar to logo)
                  if (!photoDataUrl) {
                    const img = e.target;
                    try {
                      const canvas = document.createElement('canvas');
                      canvas.width = img.naturalWidth || img.width;
                      canvas.height = img.naturalHeight || img.height;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img, 0, 0);
                      const dataUrl = canvas.toDataURL('image/png');
                      setPhotoDataUrl(dataUrl);
                    } catch (err) {
                      // Silently handle CORS errors - image will still display, just won't be in PDF
                      if (import.meta.env.DEV) {
                        console.warn('[Report] Could not convert student photo to data URL (CORS or security restriction):', err.message);
                      }
                    }
                  }
                }}
              />
            ) : null}
            <div 
              className="photo-placeholder" 
              style={{ 
                display: (!student?.photo_path || imageErrors.studentPhoto) ? 'flex' : 'none' 
              }}
            >
              <i className="fas fa-user"></i>
            </div>
          </div>
        </div>

        {/* Section A: Student Information */}
        <div className="report-section section-taarifa">
          <h3 style={{ marginBottom: '0.5px' }}>{t.sectionA}</h3>
          <table className="excel-table info-table">
            <tbody>
              <tr>
                <td>
                  <strong>{t.fullName}</strong>
                </td>
                <td>
                  {student.first_name} {student.middle_name || ''} {student.surname}
                </td>
                <td>
                  <strong>{t.sex}</strong>
                </td>
                <td>{student.sex}</td>
                <td>
                  <strong>{t.classLevel}</strong>
                </td>
                <td>{formCode}</td>
              </tr>
              <tr>
                <td>
                  <strong>{t.term}</strong>
                </td>
                <td>{term.replace('Term ', '')}</td>
                <td>
                  <strong>{t.month}</strong>
                </td>
                <td>
                  {isForm5Or6
                    ? term === 'Term I'
                      ? 'DECEMBER'
                      : 'JUNE'
                    : term === 'Term I'
                    ? 'JUNE'
                    : 'DECEMBER'}
                </td>
                <td>
                  <strong>{t.year}</strong>
                </td>
                <td>{year}</td>
              </tr>
              <tr>
                <td>
                  <strong>{t.parish}</strong>
                </td>
                <td colSpan={5}>{student_parish || t.parishMissing}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="section-spacer-4px"></div>

        {/* Section B: Academic Performance */}
        <div className="report-section section-ufanisi">
          <h3 style={{ marginBottom: '0.5px' }}>{t.sectionB}</h3>
          <table className="excel-table academic-table">
            <colgroup>
              <col style={{ width: '33%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: '33%', verticalAlign: 'middle' }}>{t.subject}</th>
                <th colSpan={4} style={{ width: '28%' }}>{t.assessmentMarks}</th>
                <th rowSpan={2} className="rotate-header" style={{ width: '5%', verticalAlign: 'middle' }}>
                  {t.total}
                </th>
                <th rowSpan={2} className="rotate-header table-header-white" style={{ width: '4%', verticalAlign: 'middle' }}>
                  {t.grade}
                </th>
                <th rowSpan={2} className="rotate-header table-header-white" style={{ width: '4%', verticalAlign: 'middle' }}>
                  {t.position}
                </th>
                <th rowSpan={2} className="table-header-white" style={{ width: '12%', verticalAlign: 'middle' }}>
                  {t.comments}
                </th>
                <th rowSpan={2} className="sahihi-header table-header-white" style={{ width: '14%', verticalAlign: 'middle' }}>
                  {t.teacherSignatureTop}<br />
                  {t.teacherSignatureBottom}
                </th>
              </tr>
              <tr>
                {months.map((month, idx) => {
                  const weight = marks_config?.month_weights?.[month] || (idx === 0 ? 100.0 : 0.0);
                  return (
                    <th key={idx} className="table-header-white" style={{ width: '7%', lineHeight: '1.2' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div>{getMonthLabel(month)}</div>
                        <div style={{ fontSize: '0.85em', marginTop: '2px' }}>({formatReportWeightPercent(weight)}%)</div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {subjects?.map((subject) => {
                // Scores may be stored with either subject_code or subject_abbreviation
                const subjectKey = subject.subject_code;
                const subjectAbbr = subject.subject_abbreviation;
                
                // Try to find scores using both code and abbreviation
                const getScore = (month) => {
                  const score1 = monthlyData[subjectKey]?.[month];
                  const _score2 = subjectAbbr ? monthlyData[subjectAbbr]?.[month] : null;
                  return score1 !== undefined && score1 !== null && score1 !== '' ? score1 : null;
                };
                
                const month1 = getScore(months[0]);
                const month2 = getScore(months[1]);
                const month3 = getScore(months[2]);
                const month4 = getScore(months[3]);
                
                // Check if all scores are null (no scores for this subject)
                const allScoresNull = month1 === null && month2 === null && month3 === null && month4 === null;
                
                // Skip this subject if all scores are null
                if (allScoresNull) {
                  return null;
                }
                
                // Apply weights
                const weight1 = (marks_config?.month_weights?.[months[0]] || 100) / 100;
                const weight2 = (marks_config?.month_weights?.[months[1]] || 0) / 100;
                const weight3 = (marks_config?.month_weights?.[months[2]] || 0) / 100;
                const weight4 = (marks_config?.month_weights?.[months[3]] || 0) / 100;
                
                const test1 = (month1 || 0) * weight1;
                const midterm = (month2 || 0) * weight2;
                const test2 = (month3 || 0) * weight3;
                const exam = (month4 || 0) * weight4;
                const total = test1 + midterm + test2 + exam;
                
                const grade = getGrade(total);
                const comment = getComment(grade);
                const rank = subject_rankings?.[subject.subject_code]?.[admNo] || '-';

                return (
                  <tr key={subject.id || subject.subject_code}>
                    <td>{subject.subject_name}</td>
                    <td>{formatReportScore(test1)}</td>
                    <td>{formatReportScore(midterm)}</td>
                    <td>{formatReportScore(test2)}</td>
                    <td>{formatReportScore(exam)}</td>
                    <td>
                      <strong>{formatReportScore(total)}</strong>
                    </td>
                    <td>
                      <strong>{grade}</strong>
                    </td>
                    <td>{rank}</td>
                    <td>{comment}</td>
                    <td className="teacher-signature">
                      {subject_teacher_signatures?.[subject.subject_code] || 
                       subject_teacher_signatures?.[subject.subject_abbreviation] || ''}
                    </td>
                  </tr>
                );
              }).filter(row => row !== null)}
            </tbody>
          </table>
            <div style={{ marginTop: '5px', fontSize: '12px', textAlign: 'left', paddingLeft: '2px' }}>
              <strong>KEY:</strong> {t.monthKey}
            </div>
        </div>

        {/* Academic Summary */}
        <div className="report-section section-majumuisho">
          <h3 style={{ marginBottom: '0.5px' }}>{t.academicSummary}</h3>
          <table className="excel-table summary-table">
            <tbody>
              <tr>
                <td>
                  <strong>{t.totalMarks}</strong>
                </td>
                <td>{formatReportScore(summary.total_marks)}</td>
                <td>
                  <strong>{t.average}</strong>
                </td>
                <td>{formatReportScore(summary.average)}</td>
                <td>
                  <strong>{t.grade}</strong>
                </td>
                <td className={`grade-cell grade-${summary.grade.toLowerCase()}`}>
                  {summary.grade}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>{t.division}</strong>
                </td>
                <td>{summary.division}</td>
                <td>
                  <strong>{t.points}</strong>
                </td>
                <td>{summary.division_point}</td>
                <td>
                  <strong>{t.positionOf}</strong>
                </td>
                <td>{summary.position}</td>
              </tr>
              <tr>
                <td colSpan={3}>
                  <strong>{t.amongStudents}</strong>
                </td>
                <td colSpan={3}>
                  <strong>{summary.total_students}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="section-spacer-4px"></div>

        {/* Section D: Comments */}
        <div className="report-section section-maoni-taaluma">
          <h3 style={{ marginBottom: '0.5px' }}>{t.sectionD}</h3>
          <table className="excel-table comments-table">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
            </colgroup>
            <tbody>
              <tr>
                <td>
                  <strong>{t.subjectTeacher}</strong>
                </td>
                <td colSpan={3}>{getCommentValue('mwalimu_taaluma') || ''}</td>
              </tr>
              <tr>
                <td>
                  <strong>{t.headTeacherComments}</strong>
                </td>
                <td colSpan={3}>{getCommentValue('mkuu_shule') || ''}</td>
              </tr>
              <tr>
                <td>
                  <strong>{t.headTeacherSignature}</strong>
                </td>
                <td className="authority-signature">
                  {showAuthoritySignatureImage ? (
                    <img
                      src={authoritySignatureImageUrl}
                      alt="Signature"
                      className="signature-image"
                      loading="eager"
                      style={{ maxWidth: '300px', maxHeight: '30px' }}
                      onError={(e) => {
                        if (import.meta.env.DEV) {
                          console.warn('[Report] Signature image load error:', e.target.src);
                        }
                        e.target.style.display = 'none';
                        setImageErrors(prev => ({ ...prev, signatureImage: true }));
                      }}
                    />
                  ) : (
                    authoritySignatureText || ''
                  )}
                </td>
                <td style={{ writingMode: 'horizontal-tb', textOrientation: 'mixed', transform: 'none', whiteSpace: 'normal', direction: 'ltr', textAlign: 'left', verticalAlign: 'middle' }}>
                  <strong style={{ writingMode: 'horizontal-tb', textOrientation: 'mixed', transform: 'none', display: 'inline' }}>{t.date}</strong>
                </td>
                <td className="authority-date">
                  {formatAuthorityDate()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="section-spacer-4px"></div>

        {/* Section C: Behavior and Conduct */}
        <div className="report-section section-tabia">
          <h3 style={{ marginBottom: '0.5px' }}>{t.sectionC}</h3>
          <div className="behavior-table-container">
            <table className="excel-table behavior-table behavior-table-left">
              <thead>
                <tr>
                  <th>{t.no}</th>
                  <th>{t.item}</th>
                  <th>{t.grade}</th>
                </tr>
              </thead>
              <tbody>
                {REPORT_TRAIT_CODES.left.map((code) => (
                  <tr key={code}>
                    <td>{code}</td>
                    <td>{getTraitDescription(reportLang, code)}</td>
                    <td>{getTabiaEvaluation(code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="excel-table behavior-table behavior-table-right">
              <thead>
                <tr>
                  <th>{t.no}</th>
                  <th>{t.item}</th>
                  <th>{t.grade}</th>
                </tr>
              </thead>
              <tbody>
                {REPORT_TRAIT_CODES.right.map((code) => (
                  <tr key={code}>
                    <td>{code}</td>
                    <td>{getTraitDescription(reportLang, code)}</td>
                    <td>{getTabiaEvaluation(code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Grade Key/Legend */}
          <div className="grade-key-legend" style={{ marginTop: '8px', padding: '4px', fontSize: '10.5px', lineHeight: '1.4', whiteSpace: 'nowrap', overflow: 'visible' }}>
            <strong>{t.marksKey}</strong> {getMarksLegend(reportLang, isForm5Or6)} | <strong>{t.conductKey}</strong> {t.conductLegend}
          </div>
        </div>

        {/* General Comments */}
        <div className="report-section section-maoni">
          <h3 style={{ marginBottom: '0.5px' }}>{t.generalComments}</h3>
          <table className="excel-table general-comments maoni-table">
            <tbody>
              <tr className="maoni-taaluma-row">
                <td className="maoni-label">
                  <strong>{t.studies}</strong>
                </td>
                <td className="maoni-content">{getCommentValue('taaluma') || ''}</td>
              </tr>
              <tr>
                <td className="maoni-label">
                  <strong>{t.service}</strong>
                </td>
                <td className="maoni-content">{studentHuduma || ''}</td>
              </tr>
              <tr>
                <td className="maoni-label">
                  <strong>{t.sports}</strong>
                </td>
                <td className="maoni-content">{getCommentValue('michezo') || ''}</td>
              </tr>
              <tr className="maoni-tabia-row">
                <td className="maoni-label">
                  <strong>{t.conduct}</strong>
                </td>
                <td className="maoni-content">{getCommentValue('tabia') || ''}</td>
              </tr>
              <tr>
                <td className="maoni-label">
                  <strong>{t.health}</strong>
                </td>
                <td className="maoni-content">{getCommentValue('sala') || ''}</td>
              </tr>
              <tr>
                <td className="maoni-label">
                  <strong>{t.feesDue}</strong>
                </td>
                <td className="maoni-content">{student_fees_debt || '0.00'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="section-spacer-4px"></div>
        {/* Instructions Section */}
        <div className="report-section section-mambo">
          <h3>{t.notes}</h3>
          <div className="instructions" style={{ lineHeight: '1.6', fontSize: '12px', textAlign: 'justify' }}>
            {classFeesAnnouncements && Object.keys(classFeesAnnouncements).length > 0 ? (
              Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                const announcement = classFeesAnnouncements[num.toString()] || classFeesAnnouncements[num];
                return announcement ? (
                  <p key={num} className="instruction-line" style={{ lineHeight: '1.6', fontSize: '12px', textAlign: 'justify', marginBottom: '18px', marginTop: '0', minHeight: 'auto', display: 'block', paddingBottom: '4px' }}>
                    {num}. {announcement}
                  </p>
                ) : null;
              }).filter(Boolean)
            ) : (
              <p className="instruction-line instruction-empty" style={{ lineHeight: '2', fontSize: '12px', textAlign: 'justify', marginBottom: '12px', marginTop: '0', minHeight: '24px', display: 'block' }}>
                {t.noAnnouncements}
              </p>
            )}
          </div>
        </div>

        {/* Signature and Stamp Section */}
        <div className="signature-stamp-section">
          <div className="signature-block">
            {showAuthoritySignatureImage ? (
              <div className="signature-image-container" style={{ textAlign: 'left', marginBottom: '5px' }}>
                <img
                  src={authoritySignatureImageUrl}
                  alt="Signature"
                  className="signature-image"
                  loading="eager"
                  style={{ maxWidth: '300px', maxHeight: '30px', display: 'inline-block', verticalAlign: 'bottom' }}
                  onError={(e) => {
                    if (import.meta.env.DEV) {
                      console.warn('[Report] Signature image load error:', e.target.src);
                    }
                    e.target.style.display = 'none';
                    setImageErrors(prev => ({ ...prev, signatureImage: true }));
                  }}
                />
              </div>
            ) : authoritySignatureText ? (
              <div className="signature-text authority-signature">{authoritySignatureText}</div>
            ) : null}
            <div className="signature-line">_________________________</div>
            <div className="signature-name">
              {authority_data?.name || ''}
            </div>
            <div className="signature-title">
              {authority_data?.title || ''}
            </div>
            <div className="signature-date">
              {t.dateShort} {formatAuthorityDate()}
            </div>
          </div>
          <div className="stamp-block">
            {(school_stamp?.stamp_image_path && !imageErrors.stampImage) ? (
              <div className="school-stamp-image">
                <img
                  src={
                    school_stamp.stamp_image_path.startsWith('http')
                      ? school_stamp.stamp_image_path
                      : resolveStaticUrl(school_stamp.stamp_image_path)
                  }
                  alt="Arusha Catholic Seminary official school stamp"
                  className="stamp-img"
                  crossOrigin="anonymous"
                  loading="eager"
                  style={{ display: 'block', visibility: 'visible', opacity: 1 }}
                  onError={(e) => {
                    if (import.meta.env.DEV) {
                      console.warn('[Report] Stamp image load error:', e.target.src);
                    }
                    e.target.style.display = 'none';
                    setImageErrors(prev => ({ ...prev, stampImage: true }));
                  }}
                />
              </div>
            ) : (
              <div className="school-stamp">
                <div className="stamp-border">
                  <div className="stamp-content">
                    <div className="stamp-text-top">ARUSHA CATHOLIC</div>
                    <div className="stamp-symbols">
                      <div className="stamp-symbol">✞</div>
                      <div className="stamp-symbol">✞</div>
                      <div className="stamp-symbol">✞</div>
                      <div className="stamp-symbol">✞</div>
                    </div>
                    <div className="stamp-motto">SEMINARY</div>
                    <div className="stamp-text-bottom">OLDONYOSAMBU</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default IndividualReportDetail;




