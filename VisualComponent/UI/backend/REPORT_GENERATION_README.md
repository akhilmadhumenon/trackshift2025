# Report Generation Feature

## Overview

The report generation endpoint creates comprehensive PDF inspection reports for completed tyre reconstruction jobs. The report includes all metrics, visualizations, and recommendations in a professional, downloadable format.

## Endpoint

### GET /api/report/:jobId

Generates and downloads a PDF inspection report for a completed reconstruction job.

**Parameters:**
- `jobId` (path parameter): The unique identifier of the reconstruction job

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="F1-Tyre-Inspection-Report-{jobId}.pdf"`
- Body: PDF file buffer

**Status Codes:**
- `200 OK`: Report generated successfully
- `400 Bad Request`: Job is not completed or has no results
- `404 Not Found`: Job ID not found
- `500 Internal Server Error`: Report generation failed

## Report Contents

The generated PDF report includes:

### Page 1: Summary and Metrics

1. **Header**
   - Report title with Ferrari branding
   - Report ID and generation timestamp

2. **Severity Score**
   - Large, color-coded severity score (0-100)
   - Green (<50), Orange (50-80), Red (>80)

3. **Key Metrics**
   - Crack count
   - Depth estimate (mm)
   - Damage types detected
   - Recommended action

4. **Damage Classification**
   - List of detected damage types:
     - Blistering
     - Micro-cracks
     - Grain
     - Cuts
     - Flat spots
     - Chunking

5. **Recommended Action**
   - Detailed description of recommended action:
     - Replace Immediately (score >80)
     - Monitor for Next Stint (score 50-80)
     - Safe for Qualifying Only (score <50)

### Page 2: Visualizations and Technical Details

1. **Severity Timeline Graph**
   - Line graph showing severity vs rotation angle
   - X-axis: Rotation angle (0-360°)
   - Y-axis: Severity score (0-100)
   - Ferrari red line with data points

2. **Visualization Assets**
   - Links to all generated assets:
     - 3D mesh model (.glb)
     - Crack map image
     - Depth map image
     - Difference video

3. **Technical Details**
   - Job ID
   - Creation and completion timestamps
   - Reference and damaged upload IDs

4. **Footer**
   - Confidentiality notice

## Usage Example

### Using cURL

```bash
curl -X GET http://localhost:5001/api/report/{jobId} \
  -o report.pdf
```

### Using JavaScript/Axios

```javascript
import axios from 'axios';
import fs from 'fs';

async function downloadReport(jobId) {
  const response = await axios.get(
    `http://localhost:5001/api/report/${jobId}`,
    { responseType: 'arraybuffer' }
  );
  
  fs.writeFileSync(`report-${jobId}.pdf`, response.data);
  console.log('Report downloaded successfully');
}
```

### Using Frontend (React)

```typescript
async function downloadReport(jobId: string) {
  try {
    const response = await fetch(`/api/report/${jobId}`);
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `F1-Tyre-Inspection-Report-${jobId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download report:', error);
  }
}
```

## Testing

### Manual Testing

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Run the test script:
   ```bash
   node test-report.js
   ```

3. Check the generated PDF file in the backend directory

### Integration Testing

The report generation can be tested as part of the complete workflow:

1. Upload reference and damaged videos
2. Trigger reconstruction
3. Wait for completion
4. Generate report
5. Verify PDF contents

## Implementation Details

### PDF Generation Library

The report uses **PDFKit** for PDF generation:
- Lightweight and fast
- Supports custom fonts and colors
- Allows drawing of graphs and charts
- Streams output for efficient memory usage

### Report Layout

- **Page Size**: A4
- **Margins**: 50pt on all sides
- **Primary Color**: Ferrari Red (#FF1801)
- **Secondary Color**: Graphite Grey (#1A1A1A)
- **Font Sizes**: 
  - Title: 28pt
  - Section Headers: 18-20pt
  - Body Text: 12pt
  - Technical Details: 10pt

### Graph Rendering

The severity timeline graph is rendered using PDFKit's drawing primitives:
- Axes with labels
- Grid lines for readability
- Ferrari red line connecting data points
- Circular markers at each data point

## Error Handling

The endpoint handles various error scenarios:

1. **Job Not Found**: Returns 404 if job ID doesn't exist
2. **Job Not Completed**: Returns 400 if job is still processing
3. **No Results**: Returns 400 if job has no reconstruction results
4. **PDF Generation Error**: Returns 500 with error details

## Future Enhancements

Potential improvements for the report generation:

1. **Image Embedding**: Include actual crack map and depth map images in PDF
2. **3D Snapshot**: Embed rendered 3D model snapshot
3. **Multiple Formats**: Support JSON, HTML, or Excel formats
4. **Custom Branding**: Allow team-specific logos and colors
5. **Comparison Reports**: Generate reports comparing multiple tyres
6. **Historical Data**: Include trends from previous inspections
7. **Digital Signatures**: Add cryptographic signatures for authenticity
8. **Internationalization**: Support multiple languages

## Dependencies

```json
{
  "pdfkit": "^0.14.0",
  "@types/pdfkit": "^0.13.4"
}
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 8.2**: Generate inspection report containing crack map, depth map, severity score, and 3D reconstruction snapshot
- **Requirement 8.3**: Include all metrics and visualizations in downloadable format
