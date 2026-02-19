/**
 * Analytics Utilities - Shared functions for analytics pages
 */

/**
 * Normalize form label from URL parameter
 * @param {string} form - Form parameter from URL (e.g., "FORM I", "FORM V", or "form-i", "form-v")
 * @returns {string} Normalized form label (e.g., "FORM I", "FORM V")
 */
export const normalizeFormLabel = (form) => {
  if (!form) return '';
  
  // If already in "FORM I" format, decode and return uppercase
  const decoded = decodeURIComponent(form);
  if (decoded.includes('FORM')) {
    return decoded.toUpperCase().trim();
  }
  
  // Otherwise, convert from slug format (form-i -> FORM I)
  return decoded
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .toUpperCase();
};

/**
 * Get streams for a form
 * @param {string} formLabel - Normalized form label
 * @returns {string[]} Array of stream options
 */
export const getStreamsForForm = (formLabel) => {
  if (formLabel.includes('FORM V') || formLabel.includes('FORM VI')) {
    return ['PCM', 'PCB', 'EGM', 'HGE', 'HGL', 'PGM'];
  }
  return ['A', 'B'];
};

/**
 * Sort monthly data chronologically
 * @param {Array} monthlyData - Array of monthly data objects
 * @returns {Array} Sorted array
 */
export const sortMonthlyData = (monthlyData) => {
  if (!monthlyData || monthlyData.length === 0) return [];
  
  const monthOrder = {
    'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5,
    'February': 1, 'March': 2, 'April': 3, 'May': 4,
    'August': 5, 'September': 6, 'October': 7, 'November': 8
  };
  
  return monthlyData.slice().sort((a, b) => {
    const yearA = a.year || 0;
    const yearB = b.year || 0;
    if (yearA !== yearB) return yearA - yearB;
    const monthA = monthOrder[a.month] || 99;
    const monthB = monthOrder[b.month] || 99;
    return monthA - monthB;
  });
};

/**
 * Get common chart options with 55% threshold line
 * @param {Object} options - Additional options to merge
 * @returns {Object} Chart options object
 */
export const getCommonChartOptions = (options = {}) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 20,
        top: 10,
        left: 10,
        right: 10
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
      annotation: {
        annotations: {
          line55: {
            type: 'line',
            yMin: 55,
            yMax: 55,
            borderColor: 'red',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: '55%',
              position: 'end',
              backgroundColor: 'red',
              color: 'white',
              font: {
                size: 12,
                weight: 'bold'
              }
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          },
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };
  
  return {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
      annotation: {
        ...defaultOptions.plugins.annotation,
        ...(options.plugins?.annotation || {}),
      },
    },
    scales: {
      ...defaultOptions.scales,
      ...options.scales,
      y: {
        ...defaultOptions.scales.y,
        ...(options.scales?.y || {}),
      },
      x: {
        ...defaultOptions.scales.x,
        ...(options.scales?.x || {}),
      },
    },
  };
};

/**
 * Calculate performance trend (improving, declining, stable)
 * @param {Array} monthlyData - Sorted monthly data
 * @returns {Object} Trend analysis
 */
export const calculateTrend = (monthlyData) => {
  if (!monthlyData || monthlyData.length < 2) {
    return { trend: 'insufficient', change: 0, message: 'Insufficient data for trend analysis' };
  }
  
  const sorted = sortMonthlyData(monthlyData);
  const first = sorted[0].average || 0;
  const last = sorted[sorted.length - 1].average || 0;
  const change = last - first;
  const percentChange = first > 0 ? ((change / first) * 100).toFixed(1) : 0;
  
  let trend = 'stable';
  let message = 'Performance is stable';
  
  if (change > 5) {
    trend = 'improving';
    message = `Performance improving by ${change.toFixed(1)}% (${percentChange}% increase)`;
  } else if (change < -5) {
    trend = 'declining';
    message = `Performance declining by ${Math.abs(change).toFixed(1)}% (${Math.abs(percentChange)}% decrease)`;
  }
  
  return { trend, change, percentChange, message };
};

/**
 * Calculate statistics from data
 * @param {Array} data - Array of data points with 'average' property
 * @returns {Object} Statistics object
 */
export const calculateStats = (data) => {
  if (!data || data.length === 0) {
    return { avg: 0, min: 0, max: 0, count: 0 };
  }
  
  const values = data.map(d => d.average || 0).filter(v => v > 0);
  if (values.length === 0) {
    return { avg: 0, min: 0, max: 0, count: 0 };
  }
  
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return { avg, min, max, count: values.length };
};

/**
 * Export data to CSV
 * @param {Array} data - Data array
 * @param {string} filename - Filename for download
 * @param {Array} headers - Column headers
 */
export const exportToCSV = (data, filename, headers = []) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }
  
  // Get headers from data if not provided
  const csvHeaders = headers.length > 0 ? headers : Object.keys(data[0]);
  
  // Create CSV content
  let csvContent = csvHeaders.join(',') + '\n';
  
  data.forEach(row => {
    const values = csvHeaders.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes
      return typeof value === 'string' && value.includes(',') 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    });
    csvContent += values.join(',') + '\n';
  });
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
