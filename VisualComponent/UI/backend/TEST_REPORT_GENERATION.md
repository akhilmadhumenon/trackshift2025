# Report Generation Tests

This document describes the test suite for the F1 Tyre Visual Difference Engine report generation functionality.

## Overview

The test suite verifies three main areas as specified in task 10.4:

1. **PDF Generation with All Components** - Tests that reports include severity scores, crack counts, depth estimates, damage classifications, and recommended actions
2. **3D Snapshot Capture** - Tests the ability to capture and store 3D scene snapshots
3. **Download Trigger** - Tests the download functionality including headers, error handling, and concurrent requests

## Requirements Covered

- **Requirement 8.1**: Download button functionality
- **Requirement 8.2**: Report generation with crack map, depth map, severity score, and 3D snapshot
- **Requirement 8.3**: File download to user's device

## Running the Tests

### Prerequisites

1. Ensure Node.js is installed (v18 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```

### Option 1: Run Tests with Server Running

For full integration testing:

1. Start the backend server in one terminal:
   ```bash
   npm run dev
   ```

2. In another terminal, run the tests:
   ```bash
   npm test
   ```

### Option 2: Run Tests Without Server

The tests will automatically detect if the server is not running and skip integration tests gracefully:

```bash
npm test
```

Output will show:
```
⚠️  Backend server is not running on port 5001
Start the server with: npm run dev
Skipping integration tests...
```

## Test Structure

### Report Generation - PDF Tests

Tests the core PDF generation functionality:

- ✅ Correct content type (`application/pdf`)
- ✅ Correct content disposition header (attachment with filename)
- ✅ Valid file size (between 1KB and 10MB)
- ✅ Valid PDF signature (`%PDF`)
- ✅ Includes severity score
- ✅ Includes crack count
- ✅ Includes depth estimate
- ✅ Includes recommended action
- ✅ Returns 404 for non-existent jobs

### Report Generation - 3D Snapshot Tests

Tests the 3D snapshot capture and storage:

- ✅ Accepts and stores snapshot data
- ✅ Returns 404 for non-existent jobs
- ✅ Includes snapshot reference in generated reports

### Report Generation - Download Trigger Tests

Tests the download functionality:

- ✅ Triggers download with correct headers
- ✅ Handles download errors gracefully
- ✅ Supports multiple sequential downloads
- ✅ Handles concurrent download requests

## Test Output

When the server is running, tests will create output files in `backend/test-output/`:

- `test-report-{jobId}.pdf` - Sample generated reports

These files are automatically cleaned up after tests complete.

## Troubleshooting

### Tests are skipped

**Problem**: All tests show "⊘ Skipped (server not running)"

**Solution**: Start the backend server with `npm run dev` before running tests

### Connection refused errors

**Problem**: Tests fail with ECONNREFUSED

**Solution**: 
1. Check that the backend server is running on port 5001
2. Verify no firewall is blocking localhost connections
3. Check that port 5001 is not in use by another application

### Job timeout errors

**Problem**: Tests fail with "Job did not complete within timeout"

**Solution**:
1. Ensure the Python service is running (required for reconstruction)
2. Check that all dependencies are installed
3. Increase timeout in test file if needed (default: 60 seconds)

## Manual Testing

For manual testing of the report generation endpoint:

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Use the provided manual test script:
   ```bash
   node test-report.js
   ```

This will:
- Create a mock reconstruction job
- Wait for completion
- Generate and download a report
- Save it as `test-report-{jobId}.pdf`

## CI/CD Integration

To integrate these tests into a CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm install
  working-directory: ./backend

- name: Start backend server
  run: npm run dev &
  working-directory: ./backend

- name: Wait for server
  run: sleep 5

- name: Run tests
  run: npm test
  working-directory: ./backend
```

## Test Coverage

The test suite covers:

- ✅ Happy path scenarios (successful report generation)
- ✅ Error scenarios (non-existent jobs, invalid data)
- ✅ Edge cases (concurrent requests, multiple downloads)
- ✅ Data validation (PDF format, headers, content)
- ✅ Integration with reconstruction pipeline

## Future Enhancements

Potential improvements to the test suite:

1. Add visual regression testing for PDF content
2. Test report generation with various damage scenarios
3. Add performance benchmarks for large reports
4. Test report generation with missing optional data
5. Add tests for report customization options
