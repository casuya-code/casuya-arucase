/**
 * Pre-Form One Interview Reports Page
 * Generate and manage interview reports
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { preFormOneService } from '../../services/preFormOneService';
import preFormOneInterviewSubjectsService from '../../services/preFormOneInterviewSubjectsService';
import preFormOneStudentsService from '../../services/preFormOneStudentsService';
import { adminAPI } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import './PreFormOneResults.css';

const PreFormOneInterviewReports = () => {
  const { year } = useParams();
  const { isAuthenticated } = useAuth();
  const [isGenerating, setIsGenerating] = useState({});
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = apiUrl.replace('/api', '');
    const cleanPath = logoPath.startsWith('/') ? logoPath.substring(1) : logoPath;
    return `${baseUrl}/static/${cleanPath}`;
  };

  const handleLogoError = (e) => {
    e.target.style.display = 'none';
  };

  // Fetch school logo
  const { data: schoolLogoData } = useQuery({
    queryKey: ['school-logo'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getSchoolLogo();
        return res.data?.logo || null;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['preform-one-students', year],
    queryFn: async () => {
      try {
        const res = await preFormOneStudentsService.getStudents(year);
        return Array.isArray(res.data) ? res.data : [];
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load students');
        }
        return [];
      }
    },
    enabled: isAuthenticated && !!year,
    retry: false,
  });

  // Fetch interview subjects
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['preform-one-interview-subjects', year],
    queryFn: async () => {
      try {
        const res = await preFormOneInterviewSubjectsService.getInterviewSubjects(year);
        return Array.isArray(res.data) ? res.data : [];
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load subjects');
        }
        return [];
      }
    },
    enabled: isAuthenticated && !!year,
    retry: false,
  });

  // Fetch interview results
  const { data: results = {}, isLoading: resultsLoading } = useQuery({
    queryKey: ['preform-one-interview-results', year],
    queryFn: async () => {
      try {
        const res = await preFormOneService.getInterviewResults(year);
        return res.data?.results || {};
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load interview results');
        }
        return {};
      }
    },
    enabled: isAuthenticated && !!year,
    retry: false,
  });

  // Fetch scores for each subject
  const fetchScoresForSubject = async (subject, students) => {
    try {
      const scoresResponse = await preFormOneStudentsService.getStudentScoresBySubject(subject.id, 'interview');
      
      if (scoresResponse?.data && Array.isArray(scoresResponse.data)) {
        const scores = {};
        scoresResponse.data.forEach(scoreData => {
          const student = students.find(s => s.id === scoreData.student_id);
          if (student) {
            if (!scores[student.admission_number]) scores[student.admission_number] = {};
            scores[student.admission_number][subject.subject_code] = scoreData.score;
          }
        });
        return scores;
      }
    } catch (error) {
      // Error fetching scores for subject
    }
    return {};
  };

  const [subjectScores, setSubjectScores] = useState({});

  // Load all subject scores
  useEffect(() => {
    const loadAllScores = async () => {
      if (students.length > 0 && subjects.length > 0) {
        const allScores = {};
        for (const subject of subjects) {
          const scores = await fetchScoresForSubject(subject, students);
          Object.assign(allScores, scores);
        }
        setSubjectScores(allScores);
      }
    };

    if (students.length > 0 && subjects.length > 0) {
      loadAllScores().catch(() => {});
    }
  }, [year, students.length, subjects.length]);

  // Format score display
  const formatSubjectScore = (score) => {
    if (score === null || score === undefined) return '-';
    if (typeof score === 'number') return score;
    return score;
  };

  // Sort students by name
  const sortedStudents = [...students].sort((a, b) => {
    if (a.first_name !== b.first_name) return a.first_name.localeCompare(b.first_name);
    if ((a.middle_name || '') !== (b.middle_name || '')) return (a.middle_name || '').localeCompare(b.middle_name || '');
    return a.surname.localeCompare(b.surname);
  });

  const downloadPDF = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to download reports');
      return;
    }

    setIsBulkGenerating(true);
    try {
      const response = await preFormOneService.downloadInterviewResultsPDF(year);
      
      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PreFormOne_Interview_Reports_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Interview reports downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate interview reports');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const generateStudentPDF = async (student) => {
    if (!isAuthenticated) {
      toast.error('Please log in to download reports');
      return;
    }

    setIsGenerating(prev => ({ ...prev, [student.id]: true }));
    try {
      const response = await preFormOneService.downloadInterviewResultsPDF(year);
      
      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PreFormOne_Interview_Report_${student.admission_number}_${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${student.first_name} ${student.surname}'s interview report downloaded successfully!`);
    } catch (error) {
      toast.error(`Failed to generate interview report for ${student.first_name} ${student.surname}`);
    } finally {
      setIsGenerating(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const downloadCSV = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to download reports');
      return;
    }

    setIsBulkGenerating(true);
    try {
      console.log('🔍 DEBUG: Fetching interview results for CSV generation, year:', year);
      const response = await preFormOneService.getInterviewResults(year);
      console.log('🔍 DEBUG: Interview results response:', response);
      
      if (!response.data?.results) {
        console.log('🔍 DEBUG: No interview results found in response');
        toast.error('No interview results found to generate reports');
        return;
      }
      
      console.log('🔍 DEBUG: Interview results data found:', response.data.results);

      const results = response.data.results;
      const csvContent = generateCSV(results);
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const filename = `PreFormOne_Interview_Reports_${year}.csv`;
      
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
      } else {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast.success('Interview reports CSV downloaded successfully!');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Failed to generate CSV reports');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const generateCSV = (results) => {
    const headers = [
      'S/N',
      'Admission Number',
      'First Name',
      'Middle Name',
      'Surname',
      'Parish',
      'Total Marks',
      'Average',
      'Grade',
      'Position',
      'Remarks'
    ];

    const rows = Object.keys(results).map((admissionNumber, index) => {
      const result = results[admissionNumber];
      return [
        index + 1,
        admissionNumber,
        result.first_name || '',
        result.middle_name || '',
        result.surname || '',
        result.parish || '',
        result.total_marks || 0,
        result.average || 0,
        result.grade || '',
        result.position || '',
        result.remarks || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    return BOM + csvContent;
  };

  return (
    <div className="preform-one-results-page-container">
      <div className="excel-card preform-one-results">
        <div className="excel-card-header">
          <i className="fas fa-file-alt"></i> PRE-FORM ONE INTERVIEW REPORTS
          <div className="header-actions">
            <Link to={`/admin/pre-form-one/${year}`} className="excel-btn secondary small">
              <i className="fas fa-arrow-left"></i> Back
            </Link>
          </div>
        </div>
        <div className="excel-card-body">
          {/* Report Header */}
          <div className="report-header-section">
            <div className="report-header">
              <div className="logo-section">
                {schoolLogoData?.logo_image_path ? (
                  <img
                    src={getLogoUrl(schoolLogoData.logo_image_path)}
                    alt="Arusha Catholic Seminary official school logo"
                    className="school-logo"
                    loading="eager"
                    onError={handleLogoError}
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
                  <p>+255 754 92 60 22 / +255 765 394 802</p>
                  <p>Email: arucase@gmail.com</p>
                </div>
              </div>
              <div className="logo-section-right">
                {schoolLogoData?.logo_image_path ? (
                  <img
                    src={getLogoUrl(schoolLogoData.logo_image_path)}
                    alt="Arusha Catholic Seminary official school logo"
                    className="school-logo-right"
                    loading="eager"
                    onError={handleLogoError}
                  />
                ) : (
                  <div className="school-logo-placeholder">
                    <i className="fas fa-school"></i>
                  </div>
                )}
              </div>
            </div>
            <div className="test-info-bar">
              PRE-FORM ONE INTERVIEW REPORTS {year}
            </div>
          </div>

          {/* Report Actions */}
          <div className="report-actions-container">
            <div className="report-action-card">
              <h3>Generate Interview Reports</h3>
              <p>Download comprehensive interview reports for {year}</p>
              <div className="action-buttons">
                <button
                  type="button"
                  onClick={downloadPDF}
                  className="download-btn-monthly"
                  disabled={isBulkGenerating}
                >
                  <i className="fas fa-file-pdf"></i>
                  {isBulkGenerating ? 'Generating PDF...' : 'Download PDF Report'}
                </button>
                <button
                  type="button"
                  onClick={downloadCSV}
                  className="download-btn-monthly"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                  disabled={isBulkGenerating}
                >
                  <i className="fas fa-file-csv"></i>
                  {isBulkGenerating ? 'Generating CSV...' : 'Download CSV Report'}
                </button>
              </div>
            </div>
          </div>

          {!studentsLoading && !subjectsLoading && !resultsLoading && students.length > 0 && (
            <>
              {/* Student Selection - Each Student on Separate Line with PDF Button */}
              <div className="excel-card">
                <div className="excel-card-header">
                  <i className="fas fa-users"></i> Select Student
                </div>
                <div className="excel-card-body">
                  <p className="instruction-text">Click on a student to generate their interview report</p>
                  
                  <div className="students-list">
                    {sortedStudents.map((student, index) => {
                      const result = results[student.admission_number] || {};
                      const hasResults = result && result.total_marks !== null && result.total_marks !== undefined;
                      
                      return (
                        <div key={student.id} className="student-report-card">
                          <div className="student-info">
                            <div className="student-details">
                              <span className="student-number">{index + 1}</span>
                              <div className="student-name">
                                <strong>{student.first_name} {student.middle_name || ''} {student.surname}</strong>
                              </div>
                              <div className="student-meta">
                                <span className="adm-number">Adm: {student.admission_number}</span>
                                {student.parish && <span className="parish">Parish: {student.parish}</span>}
                              </div>
                            </div>
                            <div className="student-status">
                              {hasResults ? (
                                <div className="report-status available">
                                  <i className="fas fa-check-circle"></i>
                                  <span>Report Available</span>
                                  <div className="report-summary">
                                    Grade: {result.grade || '-'} | Average: {result.average || '-'}
                                  </div>
                                </div>
                              ) : (
                                <div className="report-status unavailable">
                                  <i className="fas fa-exclamation-circle"></i>
                                  <span>No Report</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="student-actions">
                            <button
                              type="button"
                              onClick={() => generateStudentPDF(student)}
                              className="excel-btn primary small"
                              disabled={isGenerating[student.id] || !hasResults}
                              title={hasResults ? `Generate PDF report for ${student.first_name} ${student.surname}` : 'No report data available'}
                            >
                              <i className="fas fa-file-pdf"></i>
                              {isGenerating[student.id] ? 'Generating...' : 'Generate PDF'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="print-spacer-bottom"></div>

          <div className="back-margin">
            <Link to={`/admin/pre-form-one/${year}`} className="excel-btn">
              <i className="fas fa-arrow-left"></i> Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreFormOneInterviewReports;
