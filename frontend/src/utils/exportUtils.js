/**
 * Export Utilities - CSV, Excel, PDF
 */

// Export to CSV
export const exportToCSV = (data, filename, columns) => {
  const headers = columns.map(col => col.header || col.key).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const value = col.accessor ? col.accessor(row) : row[col.key];
      // Escape commas and quotes
      const stringValue = (value || '').toString().replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export to Excel (using CSV format with .xlsx extension)
export const exportToExcel = (data, filename, columns) => {
  // For now, we'll use CSV format
  // In production, you might want to use a library like xlsx
  exportToCSV(data, filename, columns);
};

// Download file from URL
export const downloadFile = async (url, filename) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

// Print table
export const printTable = (tableId) => {
  const printWindow = window.open('', '_blank');
  const table = document.getElementById(tableId);
  
  if (!table) {
    console.error('Table not found');
    return;
  }
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Print</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        ${table.outerHTML}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
};

