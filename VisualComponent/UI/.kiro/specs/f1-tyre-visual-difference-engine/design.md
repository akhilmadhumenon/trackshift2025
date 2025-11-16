# Design Document

## Overview

The F1 Tyre Visual Difference Engine is a single-page web application built with modern web technologies to provide real-time tyre damage analysis. The architecture follows a client-server model where the frontend handles user interaction and visualization while the backend processes video data through computer vision and 3D reconstruction pipelines.

The application uses a responsive grid layout with four main sections: navigation bar, left control panel, center 3D renderer, right insights panel, and bottom video comparison strip. The design prioritizes performance for real-time 3D rendering and video synchronization while maintaining a clean, high-contrast interface optimized for quick decision-making in pit stop environments.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Upload     │  │     3D       │  │    Video     │      │
│  │  Component   │  │   Renderer   │  │   Player     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  State Manager │                        │
│                    │    (Zustand)   │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │ REST API / WebSocket
┌────────────────────────────▼──────────────────────────────────┐
│                      Backend (Node.js/Python)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Video      │  │   TripoSR    │  │   Computer   │       │
│  │ Preprocessor │─▶│   Pipeline   │─▶│    Vision    │       │
│  └──────────────┘  └──────────────┘  │    Engine    │       │
│                                       └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   Storage    │  │   Report     │                         │
│  │   Service    │  │  Generator   │                         │
│  └──────────────┘  └──────────────┘                         │
└───────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with TypeScript for type safety and component architecture
- Three.js for 3D rendering and WebGL visualization
- React Three Fiber for declarative Three.js integration
- Zustand for lightweight state management
- TailwindCSS for utility-first styling with custom Ferrari theme
- Video.js or custom HTML5 video player for synchronized playback
- Axios for HTTP requests
- Socket.io-client for real-time processing updates

**Backend:**
- Node.js with Express for API server and file handling
- Python FastAPI for TripoSR pipeline and CV processing
- FFmpeg for video preprocessing and frame extraction
- TripoSR for 3D reconstruction from video frames
- OpenCV for computer vision operations (edge detection, difference calculation)
- NumPy for numerical operations on image data
- Redis for job queue management
- PostgreSQL for metadata storage (optional, can use file system initially)

## Components and Interfaces

### Frontend Components

#### 1. App Layout Component
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}

// Manages the overall grid layout structure
// Renders: Navbar, LeftPanel, CenterRenderer, RightPanel, BottomVideoStrip
```

#### 2. Navbar Component
```typescript
interface NavbarProps {
  onMeetTeamClick: () => void;
  onDownloadReport: () => void;
  isReportReady: boolean;
}

// Displays app title, team link, and download button
// Handles report download trigger
```

#### 3. UploadPanel Component
```typescript
interface UploadPanelProps {
  onReferenceUpload: (file: File, metadata: TyreMetadata) => void;
  onDamagedUpload: (file: File, metadata: TyreMetadata) => void;
  onReconstruct: () => void;
  isProcessing: boolean;
  processingProgress: number;
}

interface TyreMetadata {
  tyreType: string;
  compound: string;
  lapsUsed: number;
}

// Handles drag-and-drop file uploads
// Validates video angle (90° top-down)
// Collects tyre metadata
// Triggers reconstruction process
```

#### 4. ThreeDRenderer Component
```typescript
interface ThreeDRendererProps {
  meshUrl: string | null;
  crackMap: string | null;
  depthMap: string | null;
  visualizationMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  syncWithVideo: boolean;
  videoTimestamp: number;
}

type VisualizationMode = 
  | 'texture' 
  | 'wireframe' 
  | 'crackHeatmap' 
  | 'depthFog' 
  | 'normalMap' 
  | 'geometry';

// Renders 3D tyre model using Three.js
// Implements orbit, pan, zoom controls
// Applies visualization overlays
// Syncs rotation with video playback
```

#### 5. InsightsPanel Component
```typescript
interface InsightsPanelProps {
  insights: TyreInsights | null;
}

interface TyreInsights {
  crackCount: number;
  severityScore: number;
  depthEstimate: number;
  damageClassification: DamageType[];
  recommendedAction: RecommendedAction;
  severityTimeline: TimelinePoint[];
}

type DamageType = 
  | 'blistering' 
  | 'micro-cracks' 
  | 'grain' 
  | 'cuts' 
  | 'flat-spots' 
  | 'chunking';

type RecommendedAction = 
  | 'replace-immediately' 
  | 'monitor-next-stint' 
  | 'safe-qualifying-only';

interface TimelinePoint {
  rotationAngle: number;
  severity: number;
}

// Displays AI-generated insights in card format
// Renders severity timeline graph
// Shows damage classification badges
```

#### 6. VideoComparisonStrip Component
```typescript
interface VideoComparisonStripProps {
  referenceVideoUrl: string;
  damagedVideoUrl: string;
  differenceVideoUrl: string;
  onTimeUpdate: (timestamp: number) => void;
}

// Manages three synchronized video players
// Implements play/pause/seek controls
// Generates difference video visualization
// Provides frame-by-frame stepping
```

### Backend API Endpoints

#### Upload Endpoints
```
POST /api/upload/reference
- Accepts: multipart/form-data (video file + metadata)
- Returns: { uploadId: string, videoUrl: string }
- Validates video angle and format

POST /api/upload/damaged
- Accepts: multipart/form-data (video file + metadata)
- Returns: { uploadId: string, videoUrl: string }
- Validates video angle and format
```

#### Processing Endpoints
```
POST /api/reconstruct
- Accepts: { referenceUploadId: string, damagedUploadId: string }
- Returns: { jobId: string }
- Triggers async TripoSR pipeline

GET /api/reconstruct/status/:jobId
- Returns: { 
    status: 'queued' | 'processing' | 'completed' | 'failed',
    progress: number,
    result?: ReconstructionResult
  }

interface ReconstructionResult {
  meshUrl: string;
  crackMapUrl: string;
  depthMapUrl: string;
  differenceVideoUrl: string;
  insights: TyreInsights;
}
```

#### Report Endpoints
```
GET /api/report/:jobId
- Returns: PDF/ZIP file containing inspection report
- Includes all visualizations and metrics
```

### WebSocket Events

```typescript
// Client subscribes to job updates
socket.on('reconstruction:progress', (data: {
  jobId: string;
  progress: number;
  stage: string;
}) => void);

socket.on('reconstruction:complete', (data: {
  jobId: string;
  result: ReconstructionResult;
}) => void);

socket.on('reconstruction:error', (data: {
  jobId: string;
  error: string;
}) => void);
```

## Data Models

### Frontend State (Zustand Store)

```typescript
interface AppState {
  // Upload state
  referenceVideo: UploadedVideo | null;
  damagedVideo: UploadedVideo | null;
  
  // Processing state
  currentJobId: string | null;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  
  // Results
  reconstructionResult: ReconstructionResult | null;
  
  // UI state
  visualizationMode: VisualizationMode;
  syncWithVideo: boolean;
  currentVideoTimestamp: number;
  
  // Actions
  setReferenceVideo: (video: UploadedVideo) => void;
  setDamagedVideo: (video: UploadedVideo) => void;
  startReconstruction: () => Promise<void>;
  updateProcessingStatus: (status: ProcessingStatus, progress: number) => void;
  setReconstructionResult: (result: ReconstructionResult) => void;
  setVisualizationMode: (mode: VisualizationMode) => void;
  toggleVideoSync: () => void;
  updateVideoTimestamp: (timestamp: number) => void;
}

interface UploadedVideo {
  file: File;
  url: string;
  uploadId: string;
  metadata: TyreMetadata;
}

type ProcessingStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'error';
```

### Backend Data Models

```python
# Video Upload Model
class VideoUpload:
    upload_id: str
    filename: str
    file_path: str
    video_type: str  # 'reference' or 'damaged'
    metadata: TyreMetadata
    upload_timestamp: datetime
    angle_validated: bool

# Reconstruction Job Model
class ReconstructionJob:
    job_id: str
    reference_upload_id: str
    damaged_upload_id: str
    status: str  # 'queued', 'processing', 'completed', 'failed'
    progress: float
    current_stage: str
    created_at: datetime
    completed_at: datetime | None
    result: ReconstructionResult | None
    error_message: str | None

# Reconstruction Result Model
class ReconstructionResult:
    mesh_file_path: str
    crack_map_path: str
    depth_map_path: str
    difference_video_path: str
    insights: TyreInsights
```

## Error Handling

### Frontend Error Handling

1. **Upload Validation Errors**
   - Display inline error messages for invalid video angles
   - Show file format errors with supported formats
   - Provide retry mechanism for failed uploads

2. **Processing Errors**
   - Display error modal with descriptive message
   - Offer option to retry reconstruction
   - Log errors to console for debugging

3. **Network Errors**
   - Implement exponential backoff for API retries
   - Show connection status indicator
   - Cache uploaded videos locally to prevent re-upload

4. **3D Rendering Errors**
   - Fallback to 2D image view if WebGL unavailable
   - Display error message for corrupted mesh files
   - Provide browser compatibility warnings

### Backend Error Handling

1. **Video Processing Errors**
   - Validate video format and codec before processing
   - Return specific error codes for different failure types
   - Clean up temporary files on error

2. **TripoSR Pipeline Errors**
   - Implement timeout for long-running reconstructions
   - Retry failed frame extractions up to 3 times
   - Log detailed error information for debugging

3. **Resource Management**
   - Implement job queue with max concurrent processing limit
   - Clean up old job data after 24 hours
   - Monitor disk space and reject uploads if insufficient

## Testing Strategy

### Unit Tests

**Frontend:**
- Component rendering tests using React Testing Library
- State management tests for Zustand store actions
- Utility function tests for video synchronization logic
- Three.js scene setup and control tests

**Backend:**
- API endpoint tests using pytest/jest
- Video validation logic tests
- Frame extraction and preprocessing tests
- Report generation tests

### Integration Tests

- End-to-end upload and reconstruction flow
- WebSocket communication tests
- Video synchronization with 3D model rotation
- Report download functionality

### Visual Regression Tests

- Screenshot comparison for UI components
- 3D renderer output validation
- Video player layout consistency

### Performance Tests

- 3D rendering frame rate benchmarks (target: 60 FPS)
- Video synchronization latency (target: <50ms)
- API response time tests (target: <200ms for non-processing endpoints)
- Large video file upload tests (up to 500MB)

### Manual Testing Checklist

- [ ] Upload videos with various formats and resolutions
- [ ] Test drag-and-drop on different browsers
- [ ] Verify 3D controls (orbit, pan, zoom) responsiveness
- [ ] Check visualization mode toggles
- [ ] Validate video synchronization accuracy
- [ ] Test report download with different data sets
- [ ] Verify UI responsiveness on different screen sizes
- [ ] Check color contrast and readability
- [ ] Test with slow network conditions
- [ ] Verify error messages are clear and actionable

## Performance Considerations

### Frontend Optimization

1. **3D Rendering**
   - Use Level of Detail (LOD) for mesh rendering
   - Implement frustum culling for off-screen geometry
   - Lazy load texture maps
   - Use compressed texture formats (KTX2, Basis)

2. **Video Playback**
   - Preload video segments for smooth playback
   - Use adaptive bitrate streaming for large files
   - Implement video buffering strategy

3. **State Management**
   - Memoize expensive computations with useMemo
   - Debounce video timestamp updates
   - Use React.memo for pure components

### Backend Optimization

1. **Video Processing**
   - Process videos in chunks to reduce memory usage
   - Use GPU acceleration for OpenCV operations
   - Implement parallel frame extraction

2. **3D Reconstruction**
   - Optimize TripoSR input resolution based on video quality
   - Cache intermediate processing results
   - Use mesh decimation to reduce file size

3. **API Performance**
   - Implement response caching for static assets
   - Use CDN for serving processed videos and meshes
   - Compress API responses with gzip

## Security Considerations

1. **File Upload Security**
   - Validate file types and sizes on server
   - Scan uploaded files for malware
   - Use signed URLs for file access
   - Implement rate limiting on upload endpoints

2. **Data Privacy**
   - Encrypt sensitive tyre metadata
   - Implement automatic data deletion after 30 days
   - Use HTTPS for all communications
   - Sanitize file names to prevent path traversal

3. **Authentication (Future)**
   - Implement JWT-based authentication
   - Role-based access control for team members
   - Audit logging for all operations

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CDN (CloudFront)                     │
│                    (Static Assets, Videos)                   │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    Load Balancer (ALB)                       │
└────────┬───────────────────────────────────────┬────────────┘
         │                                       │
┌────────▼────────┐                    ┌────────▼────────┐
│  Frontend       │                    │  API Server     │
│  (S3 + React)   │                    │  (ECS/EC2)      │
└─────────────────┘                    └────────┬────────┘
                                                │
                                       ┌────────▼────────┐
                                       │  Processing     │
                                       │  Workers        │
                                       │  (ECS/Lambda)   │
                                       └────────┬────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              │                 │                 │
                     ┌────────▼────────┐ ┌─────▼──────┐ ┌───────▼───────┐
                     │  S3 Storage     │ │   Redis    │ │  PostgreSQL   │
                     │  (Videos/Mesh)  │ │  (Queue)   │ │  (Metadata)   │
                     └─────────────────┘ └────────────┘ └───────────────┘
```

### Deployment Strategy

1. **Development Environment**
   - Local Docker Compose setup
   - Hot reload for frontend and backend
   - Mock TripoSR pipeline for faster iteration

2. **Staging Environment**
   - AWS ECS for containerized services
   - S3 for file storage
   - CloudFront for CDN
   - Full TripoSR pipeline with GPU instances

3. **Production Environment**
   - Auto-scaling ECS services
   - Multi-AZ deployment for high availability
   - Automated backups and disaster recovery
   - Monitoring with CloudWatch and Datadog

## Future Enhancements

1. **Live Pit Stop Integration**
   - Real-time camera feed processing
   - Automatic tyre detection and tracking
   - Instant damage alerts

2. **Multi-Tyre Comparison**
   - Side-by-side comparison of all four tyres
   - Wear pattern analysis across tyre set
   - Historical comparison with previous stints

3. **Team Dashboard**
   - Aggregate statistics across multiple inspections
   - Team member collaboration features
   - Shared annotation and notes

4. **Telemetry Integration**
   - Correlate tyre damage with lap times
   - Temperature and pressure data overlay
   - Predictive wear modeling

5. **AI Voice Assistant**
   - Voice-controlled navigation
   - Spoken damage reports
   - Hands-free operation for pit crew
