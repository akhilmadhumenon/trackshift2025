# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Initialize React TypeScript project with Vite
  - Configure TailwindCSS with custom Ferrari theme colors (#FF1801, #000000, #F5F5F5, #1A1A1A)
  - Set up Node.js Express backend with TypeScript
  - Configure Python FastAPI service for CV processing
  - Create Docker Compose configuration for local development
  - Install core dependencies: Three.js, React Three Fiber, Zustand, Axios, Socket.io
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2. Implement core layout and navigation
  - [x] 2.1 Create AppLayout component with grid structure
    - Implement responsive grid: navbar, left panel, center renderer, right panel, bottom strip
    - Apply Ferrari theme styling with high-contrast colors
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 2.2 Build Navbar component
    - Add "F1 Visual Difference Engine" title with Formula-style font (Audiowide/Orbitron)
    - Implement "Meet the Team" link with modal/page navigation
    - Add download report button (disabled state initially)
    - _Requirements: 10.1, 10.2, 8.1, 8.2_

- [ ] 3. Build video upload and validation system
  - [x] 3.1 Create UploadPanel component with drag-and-drop
    - Implement two upload zones: reference and damaged tyre videos
    - Add drag-and-drop event handlers with visual feedback
    - Display uploaded file names and preview thumbnails
    - Add metadata input fields: tyre type, compound, laps used
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [x] 3.2 Implement video angle validation
    - Create validation function to check 90° top-down angle using frame analysis
    - Display error message for invalid angles with retry option
    - Show validation success indicator
    - _Requirements: 1.3, 1.4_
  
  - [x] 3.3 Build backend upload endpoints
    - Create POST /api/upload/reference endpoint with multipart handling
    - Create POST /api/upload/damaged endpoint with multipart handling
    - Implement file storage to temporary directory
    - Return upload ID and video URL
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.4 Write upload validation tests
    - Test drag-and-drop functionality
    - Test file type validation
    - Test angle validation logic
    - Test metadata collection
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [-] 4. Implement 3D reconstruction pipeline integration
  - [x] 4.1 Add reconstruction trigger button
    - Enable button only when both videos are uploaded
    - Implement onClick handler to call backend API
    - Show circular red loading indicator during processing
    - Display processing progress percentage
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 4.2 Create backend reconstruction endpoint
    - Implement POST /api/reconstruct endpoint
    - Create job queue system using Redis or in-memory queue
    - Return job ID for status tracking
    - _Requirements: 2.2_
  
  - [x] 4.3 Build video preprocessing pipeline
    - Extract frames from uploaded videos using FFmpeg
    - Detect tyre circle using OpenCV Hough Circle Transform
    - Reorient frames to perfect 90° top-down view
    - Stabilize rotation across frames
    - Normalize brightness and contrast
    - _Requirements: 2.2_
  
  - [x] 4.4 Integrate TripoSR 3D reconstruction
    - Set up TripoSR Python environment and dependencies
    - Create processing worker to run TripoSR on extracted frames
    - Generate GLB mesh file from reconstruction
    - Save mesh to storage and return URL
    - _Requirements: 2.4, 2.5_
  
  - [x] 4.5 Implement WebSocket status updates
    - Set up Socket.io server and client connections
    - Emit reconstruction:progress events with percentage
    - Emit reconstruction:complete event with result data
    - Emit reconstruction:error event on failures
    - Update frontend UI based on WebSocket events
    - _Requirements: 2.3_
  
  - [x] 4.6 Write reconstruction pipeline tests
    - Test frame extraction accuracy
    - Test tyre circle detection
    - Test TripoSR integration
    - Test job queue management
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Build 3D renderer with Three.js
  - [x] 5.1 Create ThreeDRenderer component
    - Set up React Three Fiber canvas with black background
    - Load GLB mesh file using useGLTF hook
    - Implement basic lighting setup (ambient + directional)
    - Add grid helper for spatial reference
    - _Requirements: 2.5, 3.1, 3.2, 3.3_
  
  - [x] 5.2 Implement camera controls
    - Add OrbitControls for mouse-based orbit, pan, zoom
    - Set camera position and target defaults
    - Implement "Reset View" button to restore default camera
    - Add "Auto-rotate" toggle with continuous rotation animation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.3 Add visualization mode toggles
    - Create UI controls for wireframe, crack heatmap, depth fog, texture, normal map, geometry
    - Implement wireframe material toggle
    - Apply crack heatmap as texture overlay with red coloring
    - Implement depth fog shader effect
    - Switch between texture, normal map, and geometry materials
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 5.4 Implement damage highlighting
    - Parse crack map data to identify damaged regions
    - Add glowing red edge effect to damaged areas using custom shader
    - Update highlights when crack map changes
    - _Requirements: 4.5_
  
  - [x] 5.5 Write 3D renderer tests
    - Test mesh loading and rendering
    - Test camera control interactions
    - Test visualization mode switching
    - Test damage highlight rendering
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6. Implement computer vision analysis engine
  - [x] 6.1 Build crack detection algorithm
    - Apply Canny edge detection to tyre frames
    - Use morphological operations to identify crack patterns
    - Generate crack map image with highlighted cracks
    - Count total number of detected cracks
    - _Requirements: 5.1_
  
  - [x] 6.2 Create depth estimation system
    - Compare reference and damaged frames pixel-by-pixel
    - Calculate depth differences using stereo vision techniques
    - Generate depth map with color coding (blue=shallow, red=deep)
    - Compute maximum depth estimate in millimeters
    - _Requirements: 5.3_
  
  - [x] 6.3 Implement damage classification
    - Train or use pre-trained model to classify damage types
    - Detect blistering, micro-cracks, grain, cuts, flat spots, chunking
    - Return array of detected damage types
    - _Requirements: 5.4_
  
  - [x] 6.4 Calculate severity score
    - Combine crack count, depth, and damage types into 0-100 score
    - Weight factors: crack density (40%), depth (30%), damage type severity (30%)
    - Generate severity timeline by rotation angle
    - _Requirements: 5.2, 5.6_
  
  - [x] 6.5 Generate recommended actions
    - Define rules: score >80 = replace immediately, 50-80 = monitor, <50 = safe for qualifying
    - Return recommended action based on severity score
    - _Requirements: 5.5_
  
  - [x] 6.6 Write CV engine tests
    - Test crack detection accuracy
    - Test depth estimation calculations
    - Test damage classification
    - Test severity score computation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 7. Build AI insights panel
  - [x] 7.1 Create InsightsPanel component
    - Design card layout with red borders and graphite background
    - Display crack count metric
    - Display severity score with color coding (green <50, yellow 50-80, red >80)
    - Display depth estimate in millimeters
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 7.2 Add damage classification display
    - Create badge components for each damage type
    - Show only detected damage types
    - Use Ferrari red for active badges
    - _Requirements: 5.4_
  
  - [x] 7.3 Implement recommended actions display
    - Show action text with appropriate color coding
    - Add icon indicators (warning, info, success)
    - _Requirements: 5.5_
  
  - [x] 7.4 Create severity timeline graph
    - Use Chart.js or Recharts for line graph
    - Plot severity score vs rotation angle (0-360°)
    - Apply Ferrari red line color
    - Add hover tooltips with exact values
    - _Requirements: 5.6_
  
  - [x] 7.5 Write insights panel tests
    - Test metric display formatting
    - Test damage badge rendering
    - Test timeline graph data visualization
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 8. Implement synchronized video comparison
  - [x] 8.1 Create VideoComparisonStrip component
    - Build three-column layout for video players
    - Add labels: "Reference Video", "Damaged Video", "Difference Video"
    - Ensure equal width distribution
    - _Requirements: 6.1_
  
  - [-] 8.2 Generate Canny edge detection video for real-time visualization
    - Create Python endpoint `/api/process-canny` to process uploaded damaged video with Canny edge detection
    - Implement video processing pipeline: CLAHE enhancement → Gaussian blur → Canny edge detection
    - Use cv2.VideoCapture to read damaged video frame-by-frame
    - Apply preprocessing: convert to grayscale, CLAHE (clipLimit=2.0), Gaussian blur (5x5)
    - Apply Canny edge detection with thresholds (50, 150)
    - Convert edge frames to BGR format for video encoding
    - Use cv2.VideoWriter to encode processed frames into output video (mp4v codec)
    - Store edge detection video in uploads directory and return URL
    - Update VideoComparisonStrip labels: "Damaged Video", "Canny Edge Detection", "Difference Video"
    - Modify frontend to request edge detection video when damaged video is uploaded
    - Display edge detection video in second panel synchronized with damaged video in first panel
    - _Requirements: 6.2, 6.3_
  
  - [x] 8.3 Implement video synchronization
    - Load all three videos with same duration
    - Sync play/pause across all players using shared state
    - Implement unified timeline scrubber
    - Ensure frame-accurate synchronization (<50ms latency)
    - _Requirements: 6.4, 6.5, 6.7_
  
  - [x] 8.4 Add playback controls
    - Create play/pause button affecting all videos
    - Add frame-by-frame step forward/backward buttons
    - Implement timeline scrubber with drag functionality
    - Display current timestamp
    - _Requirements: 6.4, 6.5, 6.6, 6.7_
  
  - [x] 8.5 Write video synchronization tests
    - Test play/pause synchronization
    - Test timeline scrubber accuracy
    - Test frame stepping
    - Test difference video generation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 9. Implement 3D-video synchronization
  - [x] 9.1 Add sync toggle control
    - Create "Sync with Video Timeline" checkbox in 3D renderer controls
    - Store sync state in Zustand store
    - _Requirements: 7.1_
  
  - [x] 9.2 Calculate rotation from video timestamp
    - Determine tyre rotation angle from video frame analysis
    - Map timestamp to rotation angle (0-360°)
    - Create lookup table or interpolation function
    - _Requirements: 7.2_
  
  - [x] 9.3 Update 3D model rotation
    - Listen to video timestamp updates
    - Rotate 3D mesh to match video frame orientation when sync enabled
    - Smooth rotation transitions using lerp
    - Update rotation when timeline scrubber moves
    - _Requirements: 7.2, 7.3_
  
  - [x] 9.4 Write sync functionality tests
    - Test rotation calculation accuracy
    - Test 3D model rotation updates
    - Test sync toggle behavior
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 10. Build inspection report generator
  - [x] 10.1 Create report generation endpoint
    - Implement GET /api/report/:jobId endpoint
    - Compile crack map, depth map, severity score, 3D snapshot
    - Generate PDF using library like PDFKit or Puppeteer
    - Include all metrics and visualizations
    - _Requirements: 8.2, 8.3_
  
  - [x] 10.2 Capture 3D reconstruction snapshot
    - Render 3D scene to canvas
    - Export canvas as PNG image
    - Include snapshot in report
    - _Requirements: 8.2, 8.3_
  
  - [x] 10.3 Implement download functionality
    - Enable download button when reconstruction completes
    - Trigger file download on button click
    - Show download progress indicator
    - Handle download errors gracefully
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 10.4 Write report generation tests
    - Test PDF generation with all components
    - Test 3D snapshot capture
    - Test download trigger
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 11. Implement state management with Zustand
  - [x] 11.1 Create Zustand store
    - Define AppState interface with all state properties
    - Implement actions for video uploads, reconstruction, results
    - Add UI state for visualization mode, sync toggle, video timestamp
    - _Requirements: All_
  
  - [x] 11.2 Connect components to store
    - Use Zustand hooks in all components
    - Replace local state with global state where appropriate
    - Ensure proper state updates and re-renders
    - _Requirements: All_
  
  - [x] 11.3 Write state management tests
    - Test store actions and state updates
    - Test component integration with store
    - _Requirements: All_

- [x] 12. Add error handling and loading states
  - [x] 12.1 Implement upload error handling
    - Show error messages for invalid files
    - Display network error notifications
    - Add retry mechanism for failed uploads
    - _Requirements: 1.3, 1.4_
  
  - [x] 12.2 Handle processing errors
    - Display error modal for reconstruction failures
    - Show specific error messages (timeout, invalid format, etc.)
    - Provide option to retry or upload different videos
    - _Requirements: 2.3_
  
  - [x] 12.3 Add 3D rendering fallbacks
    - Detect WebGL support and show warning if unavailable
    - Fallback to 2D image view if 3D fails
    - Handle corrupted mesh file errors
    - _Requirements: 2.5, 3.1_
  
  - [x] 12.4 Implement loading indicators
    - Show circular red loader during reconstruction
    - Display progress percentage
    - Add skeleton loaders for insights panel
    - Show video buffering indicators
    - _Requirements: 2.3_

- [ ] 13. Implement "Meet the Team" feature
  - [x] 13.1 Create team information modal or page
    - Design modal/page with team member cards
    - Include names, roles, and contact information
    - Apply Ferrari theme styling
    - _Requirements: 10.1, 10.2_
  
  - [x] 13.2 Connect to navbar link
    - Open modal/navigate to page on "Meet the Team" click
    - Add close functionality
    - _Requirements: 10.1, 10.2_

- [x] 14. Performance optimization and polish
  - [x] 14.1 Optimize 3D rendering performance
    - Implement Level of Detail (LOD) for mesh
    - Use compressed texture formats
    - Add frustum culling
    - Target 60 FPS rendering
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 14.2 Optimize video playback
    - Implement video preloading strategy
    - Add buffering for smooth playback
    - Optimize difference video generation
    - _Requirements: 6.4, 6.5_
  
  - [x] 14.3 Add responsive design
    - Test layout on different screen sizes
    - Adjust grid layout for tablets and mobile
    - Ensure touch controls work on mobile devices
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 14.4 Implement accessibility features
    - Add ARIA labels to interactive elements
    - Ensure keyboard navigation works
    - Test with screen readers
    - Verify color contrast ratios meet WCAG standards
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 15. Integration and end-to-end testing
  - [x] 15.1 Test complete upload-to-report workflow
    - Upload reference and damaged videos
    - Trigger reconstruction
    - Verify 3D model loads correctly
    - Check insights accuracy
    - Test video synchronization
    - Download and verify report
    - _Requirements: All_
  
  - [x] 15.2 Test error scenarios
    - Test with invalid video files
    - Test with network interruptions
    - Test with corrupted data
    - Verify error messages and recovery
    - _Requirements: 1.3, 1.4, 2.3_
  
  - [x] 15.3 Performance testing
    - Test with large video files (up to 500MB)
    - Measure 3D rendering frame rate
    - Measure video synchronization latency
    - Test concurrent user scenarios
    - _Requirements: All_
