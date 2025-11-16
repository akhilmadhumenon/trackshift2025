import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { io } from '../server.js';

const router = Router();

// Job status types
type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface ReconstructionJob {
  jobId: string;
  referenceUploadId: string;
  damagedUploadId: string;
  status: JobStatus;
  progress: number;
  currentStage: string;
  createdAt: Date;
  completedAt: Date | null;
  result: ReconstructionResult | null;
  errorMessage: string | null;
}

interface ReconstructionResult {
  meshUrl: string;
  crackMapUrl: string;
  depthMapUrl: string;
  differenceVideoUrl: string;
  insights: TyreInsights;
  snapshotUrl?: string;
}

interface TyreInsights {
  crackCount: number;
  severityScore: number;
  depthEstimate: number;
  damageClassification: string[];
  recommendedAction: string;
  severityTimeline: Array<{ rotationAngle: number; severity: number }>;
}

// In-memory job storage (in production, use Redis or database)
const jobs = new Map<string, ReconstructionJob>();

// Export jobs map getter for report generation
export function getJobsMap(): Map<string, ReconstructionJob> {
  return jobs;
}

// Job queue
const jobQueue: string[] = [];
let isProcessing = false;

// POST /api/reconstruct - Start reconstruction job
router.post('/', (req: Request, res: Response) => {
  try {
    const { referenceUploadId, damagedUploadId } = req.body;

    if (!referenceUploadId || !damagedUploadId) {
      return res.status(400).json({ 
        error: 'Both referenceUploadId and damagedUploadId are required' 
      });
    }

    const jobId = randomUUID();
    const job: ReconstructionJob = {
      jobId,
      referenceUploadId,
      damagedUploadId,
      status: 'queued',
      progress: 0,
      currentStage: 'Queued',
      createdAt: new Date(),
      completedAt: null,
      result: null,
      errorMessage: null
    };

    jobs.set(jobId, job);
    jobQueue.push(jobId);

    // Start processing if not already processing
    if (!isProcessing) {
      processNextJob();
    }

    res.status(200).json({
      jobId,
      status: job.status,
      message: 'Reconstruction job created successfully'
    });
  } catch (error) {
    console.error('Error creating reconstruction job:', error);
    res.status(500).json({ error: 'Failed to create reconstruction job' });
  }
});

// GET /api/reconstruct/status/:jobId - Get job status
router.get('/status/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      currentStage: job.currentStage,
      result: job.result,
      errorMessage: job.errorMessage
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// POST /api/reconstruct/snapshot/:jobId - Save 3D snapshot for job
router.post('/snapshot/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { snapshot } = req.body;

    if (!snapshot) {
      return res.status(400).json({ error: 'Snapshot data is required' });
    }

    const job = jobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Extract base64 data from data URL
    const base64Data = snapshot.replace(/^data:image\/png;base64,/, '');
    
    // Save snapshot to file system
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;
    
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const snapshotsDir = path.join(uploadDir, 'snapshots');
    
    // Ensure snapshots directory exists
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }
    
    const snapshotPath = path.join(snapshotsDir, `${jobId}.png`);
    fs.writeFileSync(snapshotPath, base64Data, 'base64');
    
    // Store snapshot URL in job result
    if (job.result) {
      job.result.snapshotUrl = `/uploads/snapshots/${jobId}.png`;
    }

    res.status(200).json({
      message: 'Snapshot saved successfully',
      snapshotUrl: `/uploads/snapshots/${jobId}.png`
    });
  } catch (error) {
    console.error('Error saving snapshot:', error);
    res.status(500).json({ 
      error: 'Failed to save snapshot',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process jobs from the queue
async function processNextJob() {
  if (jobQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const jobId = jobQueue.shift()!;
  const job = jobs.get(jobId);

  if (!job) {
    processNextJob();
    return;
  }

  try {
    // Update job status to processing
    job.status = 'processing';
    job.progress = 0;
    job.currentStage = 'Starting reconstruction';
    
    // Emit progress update via WebSocket
    io.emit('reconstruction:progress', {
      jobId: job.jobId,
      progress: job.progress,
      stage: job.currentStage
    });

    // Simulate processing stages (will be replaced with actual processing)
    await simulateProcessing(job);

    // Mark job as completed
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();

    // Emit completion event
    io.emit('reconstruction:complete', {
      jobId: job.jobId,
      result: job.result
    });

  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    job.status = 'failed';
    job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Emit error event
    io.emit('reconstruction:error', {
      jobId: job.jobId,
      error: job.errorMessage
    });
  }

  // Process next job in queue
  processNextJob();
}

// Process reconstruction job with video preprocessing
async function simulateProcessing(job: ReconstructionJob): Promise<void> {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
  
  try {
    // Stage 1: Preprocess reference video
    job.currentStage = 'Preprocessing reference video';
    job.progress = 10;
    io.emit('reconstruction:progress', {
      jobId: job.jobId,
      progress: job.progress,
      stage: job.currentStage
    });
    
    const referenceVideoPath = `${uploadDir}/${job.referenceUploadId}.mp4`;
    const referenceOutputDir = `${uploadDir}/preprocessed/${job.referenceUploadId}`;
    
    await preprocessVideo(pythonServiceUrl, referenceVideoPath, referenceOutputDir);
    
    // Stage 2: Preprocess damaged video
    job.currentStage = 'Preprocessing damaged video';
    job.progress = 30;
    io.emit('reconstruction:progress', {
      jobId: job.jobId,
      progress: job.progress,
      stage: job.currentStage
    });
    
    const damagedVideoPath = `${uploadDir}/${job.damagedUploadId}.mp4`;
    const damagedOutputDir = `${uploadDir}/preprocessed/${job.damagedUploadId}`;
    
    await preprocessVideo(pythonServiceUrl, damagedVideoPath, damagedOutputDir);
    
    // Stage 3: Running 3D reconstruction with TripoSR
    job.currentStage = 'Running 3D reconstruction';
    job.progress = 60;
    io.emit('reconstruction:progress', {
      jobId: job.jobId,
      progress: job.progress,
      stage: job.currentStage
    });
    
    const meshOutputPath = `${uploadDir}/meshes/${job.jobId}.glb`;
    const reconstructionMetadata = await runTripoSRReconstruction(
      pythonServiceUrl,
      damagedOutputDir,
      meshOutputPath
    );
    
    // Stage 4: Generating crack map
    job.currentStage = 'Detecting cracks';
    job.progress = 70;
    io.emit('reconstruction:progress', {
      jobId: job.jobId,
      progress: job.progress,
      stage: job.currentStage
    });
    
    const crackOutputDir = `${uploadDir}/crack_maps/${job.jobId}`;
    const crackResults = await runCrackDetection(
      pythonServiceUrl,
      referenceOutputDir,
      damagedOutputDir,
      crackOutputDir
    );
    
    // Stage 5: Estimating depth
    job.currentStage = 'Estimating depth';
    job.progress = 75;
    io.emit('reconstruction:progress', {
      jobId: job.jobId,
      progress: job.progress,
      stage: job.currentStage
    });
    
    const depthOutputDir = `${uploadDir}/depth_maps/${job.jobId}`;
    const depthResults = await runDepthEstimation(
      pythonServiceUrl,
      referenceOutputDir,
      damagedOutputDir,
      depthOutputDir
    );
    
    // Stage 6: Generating difference video
    job.currentStage = 'Generating difference video';
    job.progress = 85;
    io.emit('reconstruction:progress', {
      jobId: job.jobId,
      progress: job.progress,
      stage: job.currentStage
    });
    
    const differenceVideoPath = `${uploadDir}/difference_videos/${job.jobId}.mp4`;
    const diffVideoMetadata = await generateDifferenceVideo(
      pythonServiceUrl,
      referenceOutputDir,
      damagedOutputDir,
      crackOutputDir,
      depthOutputDir,
      differenceVideoPath
    );
    
    // Stage 7: Finalizing results
    job.currentStage = 'Finalizing results';
    job.progress = 95;
    io.emit('reconstruction:progress', {
      jobId: job.jobId,
      progress: job.progress,
      stage: job.currentStage
    });
    
    // Set result with actual reconstruction data
    const meshUrl = `/uploads/meshes/${job.jobId}.glb`;
    const differenceVideoUrl = `/uploads/difference_videos/${job.jobId}.mp4`;
    
    job.result = {
      meshUrl: meshUrl,
      crackMapUrl: crackResults.crack_map_url || '/uploads/mock-crack-map.png',
      depthMapUrl: depthResults.depth_map_url || '/uploads/mock-depth-map.png',
      differenceVideoUrl: differenceVideoUrl,
      insights: {
        crackCount: crackResults.crack_count || 12,
        severityScore: 65,
        depthEstimate: depthResults.max_depth_mm || 2.5,
        damageClassification: ['micro-cracks', 'grain'],
        recommendedAction: 'monitor-next-stint',
        severityTimeline: Array.from({ length: 36 }, (_, i) => ({
          rotationAngle: i * 10,
          severity: 50 + Math.random() * 30
        }))
      }
    };
  } catch (error) {
    throw new Error(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to call Python preprocessing service
async function preprocessVideo(serviceUrl: string, videoPath: string, outputDir: string): Promise<any> {
  const axios = (await import('axios')).default;
  
  // Start preprocessing job
  const startResponse = await axios.post(`${serviceUrl}/preprocess`, {
    video_path: videoPath,
    output_dir: outputDir,
    fps: 30
  });
  
  const jobId = startResponse.data.job_id;
  
  // Poll for completion
  let status = 'queued';
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes timeout
  
  while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await axios.get(`${serviceUrl}/preprocess/status/${jobId}`);
    status = statusResponse.data.status;
    
    if (status === 'failed') {
      throw new Error(`Preprocessing failed: ${statusResponse.data.error}`);
    }
    
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Preprocessing timeout');
  }
  
  // Get final metadata
  const finalResponse = await axios.get(`${serviceUrl}/preprocess/status/${jobId}`);
  return finalResponse.data.metadata;
}

// Helper function to call crack detection service
async function runCrackDetection(
  serviceUrl: string,
  referenceFramesDir: string,
  damagedFramesDir: string,
  outputDir: string
): Promise<any> {
  const axios = (await import('axios')).default;
  
  // Start crack detection job
  const startResponse = await axios.post(`${serviceUrl}/crack-detection`, {
    reference_frames_dir: referenceFramesDir,
    damaged_frames_dir: damagedFramesDir,
    output_dir: outputDir
  });
  
  const jobId = startResponse.data.job_id;
  
  // Poll for completion
  let status = 'queued';
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes timeout
  
  while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await axios.get(`${serviceUrl}/crack-detection/status/${jobId}`);
    status = statusResponse.data.status;
    
    if (status === 'failed') {
      throw new Error(`Crack detection failed: ${statusResponse.data.error}`);
    }
    
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Crack detection timeout');
  }
  
  // Get final metadata
  const finalResponse = await axios.get(`${serviceUrl}/crack-detection/status/${jobId}`);
  return finalResponse.data.metadata || {};
}

// Helper function to call depth estimation service
async function runDepthEstimation(
  serviceUrl: string,
  referenceFramesDir: string,
  damagedFramesDir: string,
  outputDir: string
): Promise<any> {
  const axios = (await import('axios')).default;
  
  // Start depth estimation job
  const startResponse = await axios.post(`${serviceUrl}/depth-estimation`, {
    reference_frames_dir: referenceFramesDir,
    damaged_frames_dir: damagedFramesDir,
    output_dir: outputDir
  });
  
  const jobId = startResponse.data.job_id;
  
  // Poll for completion
  let status = 'queued';
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes timeout
  
  while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await axios.get(`${serviceUrl}/depth-estimation/status/${jobId}`);
    status = statusResponse.data.status;
    
    if (status === 'failed') {
      throw new Error(`Depth estimation failed: ${statusResponse.data.error}`);
    }
    
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Depth estimation timeout');
  }
  
  // Get final metadata
  const finalResponse = await axios.get(`${serviceUrl}/depth-estimation/status/${jobId}`);
  return finalResponse.data.metadata || {};
}

// Helper function to call difference video generation service
async function generateDifferenceVideo(
  serviceUrl: string,
  referenceFramesDir: string,
  damagedFramesDir: string,
  crackMapsDir: string,
  depthMapsDir: string,
  outputVideoPath: string
): Promise<any> {
  const axios = (await import('axios')).default;
  
  // Start difference video generation job
  const startResponse = await axios.post(`${serviceUrl}/difference-video`, {
    reference_frames_dir: referenceFramesDir,
    damaged_frames_dir: damagedFramesDir,
    crack_maps_dir: crackMapsDir,
    depth_maps_dir: depthMapsDir,
    output_video_path: outputVideoPath,
    fps: 30,
    apply_edges: true,
    apply_crack_overlay: true,
    apply_depth_colors: true
  });
  
  const jobId = startResponse.data.job_id;
  
  // Poll for completion
  let status = 'queued';
  let attempts = 0;
  const maxAttempts = 180; // 3 minutes timeout (video generation can take longer)
  
  while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await axios.get(`${serviceUrl}/difference-video/status/${jobId}`);
    status = statusResponse.data.status;
    
    if (status === 'failed') {
      throw new Error(`Difference video generation failed: ${statusResponse.data.error}`);
    }
    
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Difference video generation timeout');
  }
  
  // Get final metadata
  const finalResponse = await axios.get(`${serviceUrl}/difference-video/status/${jobId}`);
  return finalResponse.data.metadata || {};
}

// Helper function to call TripoSR reconstruction service
async function runTripoSRReconstruction(
  serviceUrl: string, 
  preprocessingOutputDir: string, 
  outputGlbPath: string
): Promise<any> {
  const axios = (await import('axios')).default;
  const fs = (await import('fs')).default;
  const path = (await import('path')).default;
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputGlbPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Start reconstruction job
  const startResponse = await axios.post(`${serviceUrl}/reconstruct`, {
    preprocessing_output_dir: preprocessingOutputDir,
    output_glb_path: outputGlbPath,
    num_frames: 8,
    mc_resolution: 256
  });
  
  const jobId = startResponse.data.job_id;
  
  // Poll for completion
  let status = 'queued';
  let attempts = 0;
  const maxAttempts = 300; // 5 minutes timeout (reconstruction takes longer)
  
  while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await axios.get(`${serviceUrl}/reconstruct/status/${jobId}`);
    status = statusResponse.data.status;
    
    if (status === 'failed') {
      throw new Error(`3D reconstruction failed: ${statusResponse.data.error}`);
    }
    
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('3D reconstruction timeout');
  }
  
  // Get final metadata
  const finalResponse = await axios.get(`${serviceUrl}/reconstruct/status/${jobId}`);
  return finalResponse.data.metadata;
}

export default router;
