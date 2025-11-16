import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Import job storage from reconstruct route (in production, use shared database)
// For now, we'll create a simple getter function
let getJobsMap: () => Map<string, any>;

export function setJobsMapGetter(getter: () => Map<string, any>) {
  getJobsMap = getter;
}

// GET /api/report/:jobId - Generate and download inspection report
router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    // Get job data
    if (!getJobsMap) {
      return res.status(500).json({ error: 'Report service not properly initialized' });
    }
    
    const jobs = getJobsMap();
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Report can only be generated for completed jobs',
        currentStatus: job.status
      });
    }

    if (!job.result) {
      return res.status(400).json({ error: 'No reconstruction result available' });
    }

    // Generate PDF report
    const pdfBuffer = await generatePDFReport(job, jobId);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="F1-Tyre-Inspection-Report-${jobId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate PDF report with all metrics and visualizations
async function generatePDFReport(job: any, jobId: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks: Buffer[] = [];

      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const result = job.result;
      const insights = result.insights;

      // Ferrari Red color
      const ferrariRed = '#FF1801';
      const graphiteGrey = '#1A1A1A';

      // Page 1: Title and Summary
      doc.fontSize(28)
         .fillColor(ferrariRed)
         .text('F1 TYRE INSPECTION REPORT', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(12)
         .fillColor('#000000')
         .text(`Report ID: ${jobId}`, { align: 'center' });
      
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.moveDown(2);

      // Severity Score - Large and prominent
      doc.fontSize(16)
         .fillColor('#000000')
         .text('SEVERITY SCORE', { align: 'center' });

      doc.moveDown(0.5);
      
      // Color code severity score
      let severityColor = '#00AA00'; // Green
      if (insights.severityScore >= 80) {
        severityColor = ferrariRed; // Red
      } else if (insights.severityScore >= 50) {
        severityColor = '#FFA500'; // Orange/Yellow
      }

      doc.fontSize(48)
         .fillColor(severityColor)
         .text(`${insights.severityScore}`, { align: 'center' });

      doc.fontSize(12)
         .fillColor('#000000')
         .text('out of 100', { align: 'center' });

      doc.moveDown(2);

      // Key Metrics Section
      doc.fontSize(18)
         .fillColor(ferrariRed)
         .text('KEY METRICS', { underline: true });

      doc.moveDown(1);

      doc.fontSize(12)
         .fillColor('#000000');

      const metrics = [
        { label: 'Crack Count', value: insights.crackCount.toString() },
        { label: 'Depth Estimate', value: `${insights.depthEstimate.toFixed(2)} mm` },
        { label: 'Damage Types', value: insights.damageClassification.join(', ') },
        { label: 'Recommended Action', value: formatRecommendedAction(insights.recommendedAction) }
      ];

      metrics.forEach(metric => {
        doc.fontSize(12)
           .fillColor('#666666')
           .text(metric.label, { continued: true })
           .fillColor('#000000')
           .text(`: ${metric.value}`);
        doc.moveDown(0.5);
      });

      doc.moveDown(1);

      // Damage Classification Section
      doc.fontSize(18)
         .fillColor(ferrariRed)
         .text('DAMAGE CLASSIFICATION', { underline: true });

      doc.moveDown(1);

      if (insights.damageClassification.length > 0) {
        insights.damageClassification.forEach((damageType: string) => {
          doc.fontSize(12)
             .fillColor('#000000')
             .text(`• ${formatDamageType(damageType)}`);
          doc.moveDown(0.3);
        });
      } else {
        doc.fontSize(12)
           .fillColor('#666666')
           .text('No significant damage detected');
      }

      doc.moveDown(2);

      // Recommended Action Section
      doc.fontSize(18)
         .fillColor(ferrariRed)
         .text('RECOMMENDED ACTION', { underline: true });

      doc.moveDown(1);

      const actionText = getActionDescription(insights.recommendedAction);
      doc.fontSize(12)
         .fillColor('#000000')
         .text(actionText, { align: 'justify' });

      // Add new page for visualizations
      doc.addPage();

      doc.fontSize(20)
         .fillColor(ferrariRed)
         .text('SEVERITY TIMELINE', { align: 'center' });

      doc.moveDown(1);

      // Draw severity timeline graph
      drawSeverityTimeline(doc, insights.severityTimeline);

      doc.moveDown(2);

      // Add 3D reconstruction snapshot if available
      if (result.snapshotUrl) {
        doc.addPage();
        
        doc.fontSize(20)
           .fillColor(ferrariRed)
           .text('3D RECONSTRUCTION SNAPSHOT', { align: 'center' });

        doc.moveDown(1);

        try {
          // Load snapshot image from file system
          const snapshotPath = path.join(__dirname, '../../..', result.snapshotUrl);
          
          if (fs.existsSync(snapshotPath)) {
            // Calculate dimensions to fit on page while maintaining aspect ratio
            const maxWidth = 500;
            const maxHeight = 400;
            const x = (doc.page.width - maxWidth) / 2;
            const y = doc.y;
            
            doc.image(snapshotPath, x, y, {
              fit: [maxWidth, maxHeight],
              align: 'center',
              valign: 'center'
            });
            
            doc.moveDown(15); // Move down to account for image height
          } else {
            doc.fontSize(12)
               .fillColor('#666666')
               .text('3D snapshot not available', { align: 'center' });
          }
        } catch (error) {
          console.error('Error embedding snapshot:', error);
          doc.fontSize(12)
             .fillColor('#666666')
             .text('Error loading 3D snapshot', { align: 'center' });
        }

        doc.moveDown(2);
      }

      // Add visualization URLs section
      doc.fontSize(18)
         .fillColor(ferrariRed)
         .text('VISUALIZATION ASSETS', { underline: true });

      doc.moveDown(1);

      doc.fontSize(12)
         .fillColor('#000000');

      const visualizations = [
        { label: '3D Mesh Model', value: result.meshUrl },
        { label: 'Crack Map', value: result.crackMapUrl },
        { label: 'Depth Map', value: result.depthMapUrl },
        { label: 'Difference Video', value: result.differenceVideoUrl }
      ];

      visualizations.forEach(viz => {
        doc.fontSize(11)
           .fillColor('#666666')
           .text(viz.label, { continued: true })
           .fillColor('#0066CC')
           .text(`: ${viz.value}`, { link: viz.value });
        doc.moveDown(0.5);
      });

      doc.moveDown(2);

      // Add technical details section
      doc.fontSize(18)
         .fillColor(ferrariRed)
         .text('TECHNICAL DETAILS', { underline: true });

      doc.moveDown(1);

      doc.fontSize(10)
         .fillColor('#666666');

      doc.text(`Job ID: ${jobId}`);
      doc.text(`Created: ${job.createdAt.toLocaleString()}`);
      doc.text(`Completed: ${job.completedAt?.toLocaleString() || 'N/A'}`);
      doc.text(`Reference Upload: ${job.referenceUploadId}`);
      doc.text(`Damaged Upload: ${job.damagedUploadId}`);

      // Footer
      doc.fontSize(8)
         .fillColor('#999999')
         .text(
           'F1 Tyre Visual Difference Engine - Confidential',
           50,
           doc.page.height - 50,
           { align: 'center' }
         );

      // Finalize PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// Draw severity timeline graph
function drawSeverityTimeline(doc: PDFKit.PDFDocument, timeline: Array<{ rotationAngle: number; severity: number }>) {
  const graphX = 80;
  const graphY = doc.y + 20;
  const graphWidth = 450;
  const graphHeight = 200;

  // Draw axes
  doc.strokeColor('#000000')
     .lineWidth(2)
     .moveTo(graphX, graphY)
     .lineTo(graphX, graphY + graphHeight)
     .lineTo(graphX + graphWidth, graphY + graphHeight)
     .stroke();

  // Draw axis labels
  doc.fontSize(10)
     .fillColor('#000000')
     .text('Rotation Angle (degrees)', graphX + graphWidth / 2 - 50, graphY + graphHeight + 20);

  doc.save()
     .rotate(-90, { origin: [graphX - 30, graphY + graphHeight / 2] })
     .text('Severity Score', graphX - 30, graphY + graphHeight / 2)
     .restore();

  // Draw grid lines
  doc.strokeColor('#CCCCCC')
     .lineWidth(0.5);

  for (let i = 0; i <= 5; i++) {
    const y = graphY + (graphHeight / 5) * i;
    doc.moveTo(graphX, y)
       .lineTo(graphX + graphWidth, y)
       .stroke();
  }

  // Draw severity line
  if (timeline.length > 0) {
    doc.strokeColor('#FF1801')
       .lineWidth(2);

    const maxAngle = Math.max(...timeline.map(p => p.rotationAngle));
    const maxSeverity = 100;

    timeline.forEach((point, index) => {
      const x = graphX + (point.rotationAngle / maxAngle) * graphWidth;
      const y = graphY + graphHeight - (point.severity / maxSeverity) * graphHeight;

      if (index === 0) {
        doc.moveTo(x, y);
      } else {
        doc.lineTo(x, y);
      }
    });

    doc.stroke();

    // Draw data points
    doc.fillColor('#FF1801');
    timeline.forEach(point => {
      const x = graphX + (point.rotationAngle / maxAngle) * graphWidth;
      const y = graphY + graphHeight - (point.severity / maxSeverity) * graphHeight;
      doc.circle(x, y, 3).fill();
    });
  }

  // Draw Y-axis labels
  doc.fontSize(8)
     .fillColor('#000000');
  
  for (let i = 0; i <= 5; i++) {
    const value = 100 - (i * 20);
    const y = graphY + (graphHeight / 5) * i;
    doc.text(value.toString(), graphX - 25, y - 5);
  }

  // Draw X-axis labels
  const numXLabels = 5;
  for (let i = 0; i <= numXLabels; i++) {
    const angle = (360 / numXLabels) * i;
    const x = graphX + (graphWidth / numXLabels) * i;
    doc.text(angle.toString(), x - 10, graphY + graphHeight + 5);
  }
}

// Format damage type for display
function formatDamageType(type: string): string {
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format recommended action for display
function formatRecommendedAction(action: string): string {
  const actionMap: { [key: string]: string } = {
    'replace-immediately': 'Replace Immediately',
    'monitor-next-stint': 'Monitor for Next Stint',
    'safe-qualifying-only': 'Safe for Qualifying Laps Only'
  };
  return actionMap[action] || action;
}

// Get detailed action description
function getActionDescription(action: string): string {
  const descriptions: { [key: string]: string } = {
    'replace-immediately': 
      'CRITICAL: The tyre shows severe damage and must be replaced immediately. ' +
      'Do not use this tyre for any further running. The severity score indicates ' +
      'structural integrity concerns that pose a safety risk.',
    'monitor-next-stint': 
      'CAUTION: The tyre shows moderate damage. It can be used for the next stint ' +
      'but should be closely monitored. Inspect again after the stint and consider ' +
      'replacement if damage progresses.',
    'safe-qualifying-only': 
      'LIMITED USE: The tyre shows minor damage and is safe for qualifying laps only. ' +
      'The reduced load and duration of qualifying makes this acceptable, but do not ' +
      'use for race conditions.'
  };
  return descriptions[action] || 'No specific recommendation available.';
}

export default router;
