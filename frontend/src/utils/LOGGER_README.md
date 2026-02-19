# Application Logging System

## Overview

The application logging system provides centralized logging for debug, info, warn, and error messages throughout the entire application. It automatically captures React errors, unhandled promise rejections, and provides a user-friendly interface for viewing logs.

## Features

- ✅ **Centralized Logging**: Single logger instance for the entire application
- ✅ **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR
- ✅ **Error Boundary**: Catches React component errors automatically
- ✅ **Global Error Handlers**: Captures unhandled errors and promise rejections
- ✅ **Log Viewer**: Admin interface to view and filter logs
- ✅ **Export Functionality**: Export logs as JSON
- ✅ **Backend Integration**: Sends critical errors to backend in production
- ✅ **Memory Management**: Limits log store size to prevent memory issues

## Usage

### Basic Logging

```javascript
import logger from '../utils/logger';

// Debug logs (only in development)
logger.debug('Component mounted', { componentName: 'MyComponent' });

// Info logs
logger.info('User logged in', { userId: 123 });

// Warning logs
logger.warn('API response took longer than expected', { duration: 5000 });

// Error logs
logger.error('Failed to fetch data', error, { url: '/api/users' });
```

### Context-Specific Logger

```javascript
import { Logger } from '../utils/logger';

const componentLogger = new Logger('MyComponent');

componentLogger.debug('Component initialized');
componentLogger.error('Something went wrong', error);
```

### API Error Logging

```javascript
import logger from '../utils/logger';

try {
  const response = await fetch('/api/users');
  if (!response.ok) {
    logger.apiError('/api/users', 'GET', new Error('Request failed'), response);
  }
} catch (error) {
  logger.apiError('/api/users', 'GET', error);
}
```

### User Action Logging

```javascript
import logger from '../utils/logger';

const handleButtonClick = () => {
  logger.userAction('Button clicked', { buttonId: 'submit-form' });
  // ... rest of the code
};
```

### Navigation Logging

```javascript
import logger from '../utils/logger';
import { useLocation } from 'react-router-dom';

const MyComponent = () => {
  const location = useLocation();
  
  useEffect(() => {
    logger.navigation(previousLocation, location.pathname);
  }, [location]);
};
```

## Log Levels

The logger respects log levels based on environment:

- **Development**: Shows DEBUG, INFO, WARN, ERROR
- **Production**: Shows WARN, ERROR only (configurable via `VITE_LOG_LEVEL`)

Set log level via environment variable:
```bash
VITE_LOG_LEVEL=INFO  # Options: DEBUG, INFO, WARN, ERROR, NONE
```

## Error Boundary

The `ErrorBoundary` component automatically wraps the entire application and catches React component errors. It:

- Logs errors automatically
- Displays a user-friendly error message
- Shows error details in development mode
- Provides "Try Again" and "Go Home" buttons

### Custom Error Boundary

```javascript
import ErrorBoundary from '../components/common/ErrorBoundary';

<ErrorBoundary
  fallback={(error, errorInfo, reset) => (
    <div>
      <h2>Custom Error Message</h2>
      <button onClick={reset}>Retry</button>
    </div>
  )}
  onError={(error, errorInfo) => {
    // Custom error handling
  }}
>
  <YourComponent />
</ErrorBoundary>
```

## Log Viewer

Access the log viewer at `/admin/logs` (admin only).

Features:
- Filter by log level (DEBUG, INFO, WARN, ERROR)
- Search logs by message, URL, or error message
- Auto-refresh option
- Export logs as JSON
- Clear logs
- View error details and stack traces

## Utility Functions

### Get Logs

```javascript
import { getLogs } from '../utils/logger';

// Get all logs
const allLogs = getLogs();

// Get only error logs
const errorLogs = getLogs('ERROR');

// Get last 100 logs
const recentLogs = getLogs(null, 100);
```

### Clear Logs

```javascript
import { clearLogs } from '../utils/logger';

clearLogs();
```

### Export Logs

```javascript
import { exportLogs } from '../utils/logger';

exportLogs(); // Downloads logs as JSON file
```

## Backend Integration

Critical errors (ERROR level) are automatically sent to the backend in production:

- Endpoint: `POST /api/logs`
- Authentication: Not required (public endpoint for error reporting)
- Rate Limited: Yes (via express-rate-limit)

Backend stores logs in memory (configurable to use database in production).

## Best Practices

1. **Use appropriate log levels**:
   - DEBUG: Detailed information for debugging
   - INFO: General informational messages
   - WARN: Warning messages that don't break functionality
   - ERROR: Errors that need attention

2. **Include context**: Always include relevant data with logs
   ```javascript
   logger.error('Failed to save', error, { 
     userId: user.id, 
     formData: formData 
   });
   ```

3. **Don't log sensitive data**: Never log passwords, tokens, or personal information

4. **Use context-specific loggers**: Create logger instances with context names
   ```javascript
   const apiLogger = new Logger('API');
   const componentLogger = new Logger('MyComponent');
   ```

5. **Handle logging errors gracefully**: The logger silently fails if backend is unavailable

## Configuration

### Environment Variables

- `VITE_LOG_LEVEL`: Set log level (DEBUG, INFO, WARN, ERROR, NONE)
- `VITE_API_URL`: Backend API URL (for production)

### Logger Configuration

Edit `frontend/src/utils/logger.js` to customize:
- `MAX_LOG_STORE_SIZE`: Maximum logs to keep in memory (default: 1000)
- Log level thresholds
- Backend endpoint

## Troubleshooting

### Logs not appearing in viewer

1. Check if you're logged in as admin
2. Verify the route `/admin/logs` is accessible
3. Check browser console for errors

### Backend logs not being saved

1. Verify backend route `/api/logs` is registered
2. Check backend console for errors
3. Verify CORS settings allow frontend origin

### Too many logs in memory

1. Reduce `MAX_LOG_STORE_SIZE` in logger.js
2. Clear logs regularly via log viewer
3. Consider implementing database storage for production

