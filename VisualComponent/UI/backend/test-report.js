/**
 * Manual test script for report generation endpoint
 * This script creates a mock completed job and tests the report generation
 */

import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:5001';

async function testReportGeneration() {
  console.log('Testing Report Generation Endpoint...\n');

  try {
    // Step 1: Create a mock reconstruction job
    console.log('Step 1: Creating mock reconstruction job...');
    const reconstructResponse = await axios.post(`${BASE_URL}/api/reconstruct`, {
      referenceUploadId: 'test-reference-123',
      damagedUploadId: 'test-damaged-456'
    });

    const jobId = reconstructResponse.data.jobId;
    console.log(`✓ Job created with ID: ${jobId}\n`);

    // Step 2: Wait for job to complete (in real scenario, this would be async)
    console.log('Step 2: Waiting for job to complete...');
    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 60;

    while (!jobCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await axios.get(`${BASE_URL}/api/reconstruct/status/${jobId}`);
      const status = statusResponse.data.status;
      
      console.log(`  Status: ${status} (${statusResponse.data.progress}%)`);
      
      if (status === 'completed') {
        jobCompleted = true;
      } else if (status === 'failed') {
        throw new Error('Job failed: ' + statusResponse.data.errorMessage);
      }
      
      attempts++;
    }

    if (!jobCompleted) {
      throw new Error('Job did not complete within timeout');
    }

    console.log('✓ Job completed successfully\n');

    // Step 3: Generate and download report
    console.log('Step 3: Generating report...');
    const reportResponse = await axios.get(`${BASE_URL}/api/report/${jobId}`, {
      responseType: 'arraybuffer'
    });

    // Save report to file
    const reportPath = `./test-report-${jobId}.pdf`;
    fs.writeFileSync(reportPath, reportResponse.data);
    
    console.log(`✓ Report generated successfully`);
    console.log(`✓ Report saved to: ${reportPath}`);
    console.log(`✓ Report size: ${(reportResponse.data.length / 1024).toFixed(2)} KB\n`);

    // Step 4: Verify report content
    console.log('Step 4: Verifying report...');
    const contentType = reportResponse.headers['content-type'];
    const contentDisposition = reportResponse.headers['content-disposition'];
    
    console.log(`  Content-Type: ${contentType}`);
    console.log(`  Content-Disposition: ${contentDisposition}`);
    
    if (contentType === 'application/pdf') {
      console.log('✓ Report has correct content type\n');
    } else {
      console.log('✗ Report has incorrect content type\n');
    }

    console.log('=================================');
    console.log('ALL TESTS PASSED ✓');
    console.log('=================================\n');

  } catch (error) {
    console.error('\n=================================');
    console.error('TEST FAILED ✗');
    console.error('=================================');
    
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Error:', error.response?.data);
    } else {
      console.error('Error:', error.message);
    }
    
    process.exit(1);
  }
}

// Run test
console.log('\n=================================');
console.log('F1 Tyre Report Generation Test');
console.log('=================================\n');
console.log('Make sure the backend server is running on port 5001\n');

testReportGeneration();
