# Troubleshooting Guide - Always Check Logs First!

## 🎯 Core Principle

**ALWAYS check logs first, then combine with user-reported problems to solve issues together.**

## Quick Access to Logs

### In Browser Console (Development)

When debugging, use these commands in the browser console:

```javascript
// Quick error view
console.getErrors()
// or
window.logHelper.printRecentErrors()

// Error summary with statistics
console.getErrorSummary()
// or
window.logHelper.printErrorSummary()

// Search logs by keyword
window.logHelper.searchLogs('registration')
window.logHelper.searchLogs('401')
window.logHelper.searchLogs('student')

// Get logs for specific route
window.logHelper.getLogsForRoute('/admin/students/registration')

// Get recent errors only
window.logHelper.getRecentErrors(20)

// Get all recent logs
window.logHelper.getRecentLogs(50)
```

### In Admin Panel

1. Navigate to `/admin/logs`
2. Use filters:
   - Filter by level (DEBUG, INFO, WARN, ERROR)
   - Search by keyword
   - Click "Error Summary" to see grouped errors
3. Enable "Auto Refresh" to see logs in real-time

## Troubleshooting Workflow

### Step 1: Check Logs First! 🔍

**Before investigating user-reported issues, always:**

1. **Open Browser Console** (F12)
2. **Run**: `console.getErrors()` or `console.getErrorSummary()`
3. **Check Admin Logs Page**: Navigate to `/admin/logs`
4. **Look for**:
   - Recent errors related to the reported issue
   - Error patterns (same error occurring multiple times)
   - URLs where errors occur
   - Stack traces for JavaScript errors

### Step 2: Combine with User Report 📝

**Match logs with user description:**

- User says: "Registration page redirects to login"
- Logs show: `401 Unauthorized` errors on `/api/students`
- **Solution**: Authentication token issue → Check token expiration, API interceptor

### Step 3: Search Logs by Context 🔎

**Use search to find related logs:**

```javascript
// Search for authentication issues
window.logHelper.searchLogs('401')
window.logHelper.searchLogs('unauthorized')
window.logHelper.searchLogs('token')

// Search for specific page/component
window.logHelper.searchLogs('registration')
window.logHelper.searchLogs('RegistrationForm')

// Search for API errors
window.logHelper.searchLogs('API Error')
window.logHelper.searchLogs('/api/students')
```

### Step 4: Analyze Error Patterns 📊

**Use Error Summary to identify patterns:**

```javascript
const summary = window.logHelper.getErrorSummary();
console.log('Total Errors:', summary.totalErrors);
console.log('Unique Error Types:', summary.uniqueErrors);
console.log('Error Groups:', summary.errorGroups);
```

Look for:
- **Most frequent errors** (indicates systemic issues)
- **Error groups** (same error in multiple places)
- **URLs affected** (which pages have issues)

### Step 5: Fix Based on Logs + User Report 🛠️

**Combine information:**

1. **Logs show**: `ReferenceError: formLevel is not defined` at line 300
2. **User reports**: "Registration page not working"
3. **Solution**: Variable name mismatch → Fix variable reference

## Common Scenarios

### Scenario 1: User Reports "Page Redirects to Login"

**Check logs:**
```javascript
// Look for 401 errors
window.logHelper.searchLogs('401')
window.logHelper.getLogsForRoute('/admin/students/registration')
```

**Common causes from logs:**
- Token expired → Logs show `401 Unauthorized`
- Missing token → Logs show no Authorization header
- Invalid token → Logs show `401` with token present

**Fix:** Update API interceptor or token refresh logic

### Scenario 2: User Reports "Form Not Submitting"

**Check logs:**
```javascript
// Look for form submission errors
window.logHelper.searchLogs('submit')
window.logHelper.searchLogs('mutation')
window.logHelper.getRecentErrors(10)
```

**Common causes from logs:**
- Validation errors → Logs show `400 Bad Request`
- Network errors → Logs show `Network error`
- API errors → Logs show error response details

**Fix:** Check form validation, API endpoint, network connectivity

### Scenario 3: User Reports "Component Not Loading"

**Check logs:**
```javascript
// Look for React errors
window.logHelper.searchLogs('Error Boundary')
window.logHelper.searchLogs('component')
window.logHelper.getRecentErrors(20)
```

**Common causes from logs:**
- React component errors → Logs show component stack trace
- Missing imports → Logs show `ReferenceError`
- API failures → Logs show failed API calls

**Fix:** Check component code, imports, API endpoints

## Log Analysis Tips

### 1. Check Timestamps
- Recent errors are more relevant
- Look for errors around the time user reported the issue

### 2. Check URLs
- Errors on specific routes indicate route-specific issues
- Use `getLogsForRoute()` to filter by route

### 3. Check Error Types
- `ReferenceError` → Missing variable/import
- `TypeError` → Wrong data type
- `401 Unauthorized` → Authentication issue
- `404 Not Found` → Missing route/endpoint
- `500 Internal Server Error` → Backend issue

### 4. Check Error Frequency
- Same error multiple times → Systemic issue
- Single occurrence → One-time issue

### 5. Check Error Context
- Look at `data` field in logs for additional context
- Check `url` field to see where error occurred
- Review `stack` trace for exact location

## Best Practices

1. **Always check logs first** before asking user for more details
2. **Use search** to find relevant logs quickly
3. **Check error summary** to identify patterns
4. **Combine log data with user report** for complete picture
5. **Export logs** if needed for deeper analysis
6. **Clear logs** periodically to avoid clutter (but export first!)

## Quick Reference

### Console Commands
- `console.getErrors()` - Show recent errors
- `console.getErrorSummary()` - Show error statistics
- `window.logHelper.searchLogs('keyword')` - Search logs
- `window.logHelper.getLogsForRoute('/path')` - Get route-specific logs

### Admin Panel
- `/admin/logs` - Full log viewer
- Filter by level, search by keyword
- Error Summary button for grouped errors
- Export logs for analysis

### Log Levels
- **DEBUG**: Detailed debugging info (development only)
- **INFO**: General information
- **WARN**: Warnings that don't break functionality
- **ERROR**: Errors that need attention

## Example: Solving Registration Issue

**User Report:** "When I try to add a student, it redirects to login"

**Step 1: Check Logs**
```javascript
console.getErrors()
// Shows: [ERROR] API Error: POST /api/students 401 (Unauthorized)
```

**Step 2: Search Related Logs**
```javascript
window.logHelper.searchLogs('students')
window.logHelper.searchLogs('401')
// Shows multiple 401 errors on student API calls
```

**Step 3: Check Error Summary**
```javascript
console.getErrorSummary()
// Shows: "API Error: POST /api/students" occurred 5 times
// All on route: /admin/students/registration/form-i/year/2025/stream/A
```

**Step 4: Analyze**
- Logs show 401 errors on student API
- User is on registration page
- Token might be expired or missing

**Step 5: Fix**
- Check API interceptor
- Verify token is being sent
- Check token expiration logic
- Update error handling to show message before redirect

**Result:** Fixed API interceptor to handle 401 errors gracefully, showing error message before redirect.

---

## Remember: Logs + User Report = Complete Picture! 🎯

