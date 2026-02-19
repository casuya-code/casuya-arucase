/**
 * Log Helper Utility
 * Provides easy access to logs for debugging and troubleshooting
 */
import { getLogs } from './logger';

/**
 * Get recent error logs
 * @param {number} limit - Number of recent errors to return
 * @returns {Array} Array of error log entries
 */
export const getRecentErrors = (limit = 10) => {
  return getLogs('ERROR', limit);
};

/**
 * Get recent warnings
 * @param {number} limit - Number of recent warnings to return
 * @returns {Array} Array of warning log entries
 */
export const getRecentWarnings = (limit = 10) => {
  return getLogs('WARN', limit);
};

/**
 * Get all recent logs
 * @param {number} limit - Number of recent logs to return
 * @returns {Array} Array of log entries
 */
export const getRecentLogs = (limit = 50) => {
  return getLogs(null, limit);
};

/**
 * Search logs by keyword
 * @param {string} keyword - Search keyword
 * @param {number} limit - Maximum number of results
 * @returns {Array} Array of matching log entries
 */
export const searchLogs = (keyword, limit = 50) => {
  const logs = getLogs();
  const keywordLower = keyword.toLowerCase();
  
  return logs
    .filter(log => 
      log.message?.toLowerCase().includes(keywordLower) ||
      log.url?.toLowerCase().includes(keywordLower) ||
      log.error?.message?.toLowerCase().includes(keywordLower) ||
      JSON.stringify(log.data || {}).toLowerCase().includes(keywordLower)
    )
    .slice(0, limit);
};

/**
 * Get logs for a specific route/page
 * @param {string} route - Route path (e.g., '/admin/students/registration')
 * @param {number} limit - Maximum number of results
 * @returns {Array} Array of log entries for that route
 */
export const getLogsForRoute = (route, limit = 50) => {
  const logs = getLogs();
  return logs
    .filter(log => log.url?.includes(route))
    .slice(0, limit);
};

/**
 * Get logs for a specific time range
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {Array} Array of log entries in the time range
 */
export const getLogsForTimeRange = (startTime, endTime) => {
  const logs = getLogs();
  return logs.filter(log => {
    const logTime = new Date(log.timestamp);
    return logTime >= startTime && logTime <= endTime;
  });
};

/**
 * Get error summary statistics
 * @returns {Object} Error statistics
 */
export const getErrorSummary = () => {
  const logs = getLogs();
  const errors = logs.filter(log => log.level === 'ERROR');
  const warnings = logs.filter(log => log.level === 'WARN');
  
  // Group errors by message
  const errorGroups = {};
  errors.forEach(error => {
    const key = error.message || 'Unknown error';
    if (!errorGroups[key]) {
      errorGroups[key] = {
        message: key,
        count: 0,
        firstOccurrence: error.timestamp,
        lastOccurrence: error.timestamp,
        urls: new Set(),
      };
    }
    errorGroups[key].count++;
    if (error.url) {
      errorGroups[key].urls.add(error.url);
    }
    if (new Date(error.timestamp) < new Date(errorGroups[key].firstOccurrence)) {
      errorGroups[key].firstOccurrence = error.timestamp;
    }
    if (new Date(error.timestamp) > new Date(errorGroups[key].lastOccurrence)) {
      errorGroups[key].lastOccurrence = error.timestamp;
    }
  });
  
  return {
    totalErrors: errors.length,
    totalWarnings: warnings.length,
    uniqueErrors: Object.keys(errorGroups).length,
    errorGroups: Object.values(errorGroups).map(group => ({
      ...group,
      urls: Array.from(group.urls),
    })),
    recentErrors: errors.slice(0, 10),
  };
};

/**
 * Format logs for console display
 * @param {Array} logs - Array of log entries
 * @returns {string} Formatted log string
 */
export const formatLogsForConsole = (logs) => {
  return logs.map(log => {
    const timestamp = new Date(log.timestamp).toLocaleString();
    let output = `[${timestamp}] [${log.level}] ${log.message}`;
    
    if (log.url) {
      output += `\n  URL: ${log.url}`;
    }
    
    if (log.error) {
      output += `\n  Error: ${log.error.name} - ${log.error.message}`;
      if (log.error.stack) {
        output += `\n  Stack: ${log.error.stack.split('\n').slice(0, 3).join('\n')}`;
      }
    }
    
    if (log.data) {
      output += `\n  Data: ${JSON.stringify(log.data, null, 2)}`;
    }
    
    return output;
  }).join('\n\n');
};

/**
 * Print recent errors to console (for debugging)
 */
export const printRecentErrors = () => {
  const errors = getRecentErrors(10);
  if (errors.length === 0) {
    console.log('No recent errors found.');
    return;
  }
  
  console.group('🔴 Recent Errors');
  console.log(formatLogsForConsole(errors));
  console.groupEnd();
};

/**
 * Print error summary to console (for debugging)
 */
export const printErrorSummary = () => {
  const summary = getErrorSummary();
  console.group('📊 Error Summary');
  console.log(`Total Errors: ${summary.totalErrors}`);
  console.log(`Total Warnings: ${summary.totalWarnings}`);
  console.log(`Unique Error Types: ${summary.uniqueErrors}`);
  
  if (summary.errorGroups.length > 0) {
    console.group('Error Groups:');
    summary.errorGroups.forEach(group => {
      console.log(`\n${group.message}`);
      console.log(`  Count: ${group.count}`);
      console.log(`  First: ${new Date(group.firstOccurrence).toLocaleString()}`);
      console.log(`  Last: ${new Date(group.lastOccurrence).toLocaleString()}`);
      if (group.urls.length > 0) {
        console.log(`  URLs: ${group.urls.join(', ')}`);
      }
    });
    console.groupEnd();
  }
  
  console.groupEnd();
};

// Make functions available globally for easy console access
if (typeof window !== 'undefined') {
  window.logHelper = {
    getRecentErrors,
    getRecentWarnings,
    getRecentLogs,
    searchLogs,
    getLogsForRoute,
    getLogsForTimeRange,
    getErrorSummary,
    formatLogsForConsole,
    printRecentErrors,
    printErrorSummary,
  };
  
  // Add console shortcuts
  console.getErrors = printRecentErrors;
  console.getErrorSummary = printErrorSummary;
}

export default {
  getRecentErrors,
  getRecentWarnings,
  getRecentLogs,
  searchLogs,
  getLogsForRoute,
  getLogsForTimeRange,
  getErrorSummary,
  formatLogsForConsole,
  printRecentErrors,
  printErrorSummary,
};

