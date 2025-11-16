/**
 * Report Generation Tests
 * 
 * These tests verify:
 * 1. PDF generation with all components (severity score, crack count, depth, recommendations)
 * 2. 3D snapshot capture and storage
 * 3. Download trigger functionality
 * 
 * Requirements: 8.1, 8.2, 8.3
 * 
 * NOTE: These tests require the backend server to be running on port 5001
 * Start the server with: npm run dev
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5001';
const TEST_OUTPUT_DIR = path.join(__dirname, '../../test-output');

// Ensure test output directory exists
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

// Helper function to check if server is running
async function isServerRunning(): Promise<boolean> {
  try {
    await axios.get(`${BASE_URL}/api/reconstruct/status/test`, { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Helper function to wait for job completion
async function waitForJobCompletion(jobId: string, maxAttempts = 60): Promise<boolean> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const statusResponse = await axios.get(`${BASE_URL}/api/reconstruct/status/${jobId}`);
      const status = statusResponse.data.status;
      
      if (status === 'completed') {
        return true;
      } else if (status === 'failed') {
        throw new Error('Job failed: ' + statusResponse.data.errorMessage);
      }
    } catch (error) {
      console.error('Error checking job status:', error);
    }
    
    attempts++;
  }
  
  return false;
}

describe('Report Generation - PDF Tests', () => {
  let testJobId: string;
  let testReportPath: string;
  let serverRunning: boolean;

  before(async () => {
    serverRunning = await isServerRunning();
    
    if (!serverRunning) {
      console.log('\n⚠️  Backend server is not running on port 5001');
      console.log('Start the server with: npm run dev');
      console.log('Skipping integration tests...\n');
      return;
    }

    try {
      const reconstructResponse = await axios.post(`${BASE_URL}/api/reconstruct`, {
        referenceUploadId: 'test-reference-report-gen',
        damagedUploadId: 'test-damaged-report-gen'
      });

      testJobId = reconstructResponse.data.jobId;
      testReportPath = path.join(TEST_OUTPUT_DIR, `test-report-${testJobId}.pdf`);

      const completed = await waitForJobCompletion(testJobId);
      
      if (!completed) {
        throw new Error('Job did not complete within timeout');
      }
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  it('should generate PDF report with correct content type', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    assert.strictEqual(response.headers['content-type'], 'application/pdf');
  });

  it('should generate PDF report with correct content disposition header', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    const contentDisposition = response.headers['content-disposition'];
    assert.ok(contentDisposition.includes('attachment'), 'Should have attachment disposition');
    assert.ok(contentDisposition.includes(`F1-Tyre-Inspection-Report-${testJobId}.pdf`), 'Should include job ID in filename');
  });

  it('should generate PDF report with valid file size', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    const reportSize = response.data.byteLength;
    assert.ok(reportSize > 1000, 'Report should be larger than 1KB');
    assert.ok(reportSize < 10 * 1024 * 1024, 'Report should be smaller than 10MB');
    
    console.log(`  ℹ Report size: ${(reportSize / 1024).toFixed(2)} KB`);
  });

  it('should generate valid PDF file with correct signature', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    // Save report to file
    fs.writeFileSync(testReportPath, response.data);
    assert.ok(fs.existsSync(testReportPath), 'Report file should be created');

    // Verify PDF signature
    const fileBuffer = fs.readFileSync(testReportPath);
    const pdfSignature = fileBuffer.toString('utf8', 0, 4);
    assert.strictEqual(pdfSignature, '%PDF', 'File should have valid PDF signature');
    
    console.log(`  ℹ Report saved to: ${testReportPath}`);
  });

  it('should include severity score in PDF report', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    const pdfContent = response.data.toString('utf8');
    assert.ok(
      pdfContent.includes('SEVERITY') || pdfContent.includes('Severity'),
      'Report should include severity score'
    );
  });

  it('should include crack count in PDF report', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    const pdfContent = response.data.toString('utf8');
    assert.ok(
      pdfContent.includes('Crack') || pdfContent.includes('crack'),
      'Report should include crack count'
    );
  });

  it('should include depth estimate in PDF report', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    const pdfContent = response.data.toString('utf8');
    assert.ok(
      pdfContent.includes('Depth') || pdfContent.includes('depth'),
      'Report should include depth estimate'
    );
  });

  it('should include recommended action in PDF report', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    const pdfContent = response.data.toString('utf8');
    assert.ok(
      pdfContent.includes('RECOMMENDED') || pdfContent.includes('Recommended'),
      'Report should include recommended action'
    );
  });

  it('should return 404 for non-existent job', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    try {
      await axios.get(`${BASE_URL}/api/report/non-existent-job-id-12345`, {
        responseType: 'arraybuffer'
      });
      assert.fail('Should have thrown 404 error');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        assert.strictEqual(error.response?.status, 404, 'Should return 404 for non-existent job');
      } else {
        throw error;
      }
    }
  });
});

describe('Report Generation - 3D Snapshot Tests', () => {
  let testJobId: string;
  let serverRunning: boolean;

  before(async () => {
    serverRunning = await isServerRunning();
    
    if (!serverRunning) {
      return;
    }

    try {
      const reconstructResponse = await axios.post(`${BASE_URL}/api/reconstruct`, {
        referenceUploadId: 'test-reference-snapshot',
        damagedUploadId: 'test-damaged-snapshot'
      });

      testJobId = reconstructResponse.data.jobId;
      await waitForJobCompletion(testJobId);
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  it('should accept and store 3D snapshot data', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    // Create a minimal valid PNG data URL
    const mockSnapshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const response = await axios.post(
      `${BASE_URL}/api/reconstruct/snapshot/${testJobId}`,
      { snapshot: mockSnapshot },
      { headers: { 'Content-Type': 'application/json' } }
    );

    assert.strictEqual(response.status, 200, 'Should accept snapshot');
    assert.ok(response.data.snapshotUrl, 'Should return snapshot URL');
    
    console.log(`  ℹ Snapshot URL: ${response.data.snapshotUrl}`);
  });

  it('should return 404 for snapshot of non-existent job', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const mockSnapshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    try {
      await axios.post(
        `${BASE_URL}/api/reconstruct/snapshot/non-existent-job-id`,
        { snapshot: mockSnapshot },
        { headers: { 'Content-Type': 'application/json' } }
      );
      assert.fail('Should have thrown 404 error');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        assert.strictEqual(error.response?.status, 404, 'Should return 404 for non-existent job');
      } else {
        throw error;
      }
    }
  });

  it('should include 3D snapshot reference in generated report', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    // Upload snapshot first
    const mockSnapshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    await axios.post(
      `${BASE_URL}/api/reconstruct/snapshot/${testJobId}`,
      { snapshot: mockSnapshot },
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Generate report
    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    const pdfContent = response.data.toString('utf8');
    assert.ok(
      pdfContent.includes('3D') || pdfContent.includes('RECONSTRUCTION'),
      'Report should reference 3D reconstruction'
    );
  });
});

describe('Report Generation - Download Trigger Tests', () => {
  let testJobId: string;
  let serverRunning: boolean;

  before(async () => {
    serverRunning = await isServerRunning();
    
    if (!serverRunning) {
      return;
    }

    try {
      const reconstructResponse = await axios.post(`${BASE_URL}/api/reconstruct`, {
        referenceUploadId: 'test-download-trigger',
        damagedUploadId: 'test-download-trigger-dam'
      });

      testJobId = reconstructResponse.data.jobId;
      await waitForJobCompletion(testJobId);
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  it('should trigger download with correct headers', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    const response = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    // Verify download headers
    assert.strictEqual(response.headers['content-type'], 'application/pdf', 'Should have PDF content type');
    assert.ok(response.headers['content-disposition'].includes('attachment'), 'Should trigger download');
    assert.ok(response.headers['content-length'], 'Should include content length');
    
    const contentLength = parseInt(response.headers['content-length']);
    assert.ok(contentLength > 0, 'Content length should be positive');
    assert.strictEqual(contentLength, response.data.byteLength, 'Content length should match actual size');
  });

  it('should handle download errors gracefully', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    try {
      await axios.get(`${BASE_URL}/api/report/invalid-job-id-xyz`, {
        responseType: 'arraybuffer'
      });
      assert.fail('Should have thrown error for invalid job');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        assert.ok(
          error.response?.status === 404 || error.response?.status === 400,
          'Should return 404 or 400 for invalid job'
        );
      } else {
        throw error;
      }
    }
  });

  it('should support multiple sequential downloads', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    // Download same report multiple times
    const response1 = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    const response2 = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    const response3 = await axios.get(`${BASE_URL}/api/report/${testJobId}`, {
      responseType: 'arraybuffer'
    });

    // All downloads should succeed
    assert.strictEqual(response1.status, 200, 'First download should succeed');
    assert.strictEqual(response2.status, 200, 'Second download should succeed');
    assert.strictEqual(response3.status, 200, 'Third download should succeed');
    
    // All downloads should have same size
    assert.strictEqual(
      response1.data.byteLength,
      response2.data.byteLength,
      'Downloads should have consistent size'
    );
    assert.strictEqual(
      response2.data.byteLength,
      response3.data.byteLength,
      'Downloads should have consistent size'
    );
    
    console.log(`  ℹ Successfully downloaded report ${3} times`);
  });

  it('should handle concurrent download requests', async () => {
    if (!serverRunning) {
      console.log('  ⊘ Skipped (server not running)');
      return;
    }

    // Make 5 concurrent download requests
    const requests = Array(5).fill(null).map(() => 
      axios.get(`${BASE_URL}/api/report/${testJobId}`, {
        responseType: 'arraybuffer'
      })
    );

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach((response, index) => {
      assert.strictEqual(response.status, 200, `Request ${index + 1} should succeed`);
      assert.strictEqual(response.headers['content-type'], 'application/pdf', 'Should return PDF');
      assert.ok(response.data.byteLength > 1000, 'Should have valid content');
    });
    
    console.log(`  ℹ Successfully handled ${responses.length} concurrent downloads`);
  });
});
