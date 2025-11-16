# Requirements Document

## Introduction

The F1 Tyre Visual Difference Engine is a real-time web dashboard that enables F1 pit stop inspection teams to analyze tyre quality through computer vision and 3D reconstruction. The system processes video uploads of reference and damaged tyres, generates 3D models using TripoSR, performs visual difference analysis, and presents actionable insights through an interactive interface with synchronized video playback and 3D visualization.

## Glossary

- **Dashboard**: The web-based user interface of the F1 Tyre Visual Difference Engine
- **Reference Tyre Video**: Video footage of a tyre in pristine condition used as baseline for comparison
- **Damaged Tyre Video**: Video footage of a tyre suspected of having damage or wear
- **TripoSR Pipeline**: The 3D reconstruction processing system that converts video frames into 3D mesh models
- **3D Renderer**: The Three.js-based visualization component that displays reconstructed tyre models
- **Difference Video**: Computed video output showing visual differences between reference and damaged tyres
- **Crack Map**: Visual representation identifying crack locations and patterns on the tyre surface
- **Depth Map**: Visual representation showing depth variations across the tyre surface
- **Severity Score**: Numerical metric (0-100) quantifying the extent of tyre damage
- **Inspection Report**: Downloadable document containing crack map, depth analysis, severity index, and 3D reconstruction snapshot
- **Video Synchronization**: Coordinated playback of multiple video streams at identical timestamps
- **Damage Classification**: Categorization of tyre damage into types (blistering, micro-cracks, grain, cuts, flat spots, chunking)

## Requirements

### Requirement 1

**User Story:** As a pit stop inspection team member, I want to upload reference and damaged tyre videos, so that the system can analyze differences between them.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a drag-and-drop interface for Reference Tyre Video upload
2. THE Dashboard SHALL provide a drag-and-drop interface for Damaged Tyre Video upload
3. WHEN a video file is dropped into the upload area, THE Dashboard SHALL validate that the video angle is 90° top-down view
4. IF the video angle validation fails, THEN THE Dashboard SHALL display an error message indicating invalid camera angle
5. WHEN a valid video is uploaded, THE Dashboard SHALL display metadata fields for tyre type, compound, and laps used

### Requirement 2

**User Story:** As a pit stop inspection team member, I want to trigger 3D reconstruction of uploaded tyres, so that I can visualize the tyre geometry in three dimensions.

#### Acceptance Criteria

1. WHEN both Reference Tyre Video and Damaged Tyre Video are uploaded, THE Dashboard SHALL enable the "Reconstruct 3D Model" button
2. WHEN the "Reconstruct 3D Model" button is clicked, THE Dashboard SHALL send video data to the TripoSR Pipeline
3. WHILE the TripoSR Pipeline is processing, THE Dashboard SHALL display a circular red loading indicator
4. WHEN the TripoSR Pipeline completes processing, THE Dashboard SHALL receive a GLB mesh file, Depth Map, Crack Map, and Severity Score
5. WHEN reconstruction artifacts are received, THE Dashboard SHALL render the 3D mesh in the 3D Renderer

### Requirement 3

**User Story:** As a pit stop inspection team member, I want to interact with the 3D tyre model, so that I can examine damage from multiple angles.

#### Acceptance Criteria

1. THE 3D Renderer SHALL support mouse-based orbit control to rotate the view around the tyre model
2. THE 3D Renderer SHALL support mouse-based pan control to translate the view position
3. THE 3D Renderer SHALL support mouse-based zoom control to adjust viewing distance
4. THE 3D Renderer SHALL provide a "Reset View" button that returns the camera to default position
5. THE 3D Renderer SHALL provide an "Auto-rotate" toggle that continuously rotates the model when enabled

### Requirement 4

**User Story:** As a pit stop inspection team member, I want to toggle different visualization modes on the 3D model, so that I can focus on specific damage characteristics.

#### Acceptance Criteria

1. THE 3D Renderer SHALL provide a wireframe toggle that displays the mesh structure when enabled
2. THE 3D Renderer SHALL provide a crack heatmap overlay toggle that highlights crack locations in red when enabled
3. THE 3D Renderer SHALL provide a depth fog overlay toggle that visualizes depth variations when enabled
4. THE 3D Renderer SHALL provide view mode options for texture, normal map, and geometry display
5. WHEN damage is detected, THE 3D Renderer SHALL highlight damaged areas with glowing red edges

### Requirement 5

**User Story:** As a pit stop inspection team member, I want to view AI-generated insights about tyre damage, so that I can make informed decisions about tyre replacement.

#### Acceptance Criteria

1. THE Dashboard SHALL display the total crack count in the AI Insights panel
2. THE Dashboard SHALL display the Severity Score (0-100) in the AI Insights panel
3. THE Dashboard SHALL display the depth estimate in millimeters in the AI Insights panel
4. THE Dashboard SHALL display Damage Classification categories (blistering, micro-cracks, grain, cuts, flat spots, chunking) in the AI Insights panel
5. THE Dashboard SHALL display recommended actions (replace immediately, monitor for next stint, safe for qualifying laps only) in the AI Insights panel
6. THE Dashboard SHALL display a timeline graph showing damage severity versus rotation angle in the AI Insights panel

### Requirement 6

**User Story:** As a pit stop inspection team member, I want to view synchronized video playback of reference, damaged, and difference videos, so that I can compare tyre conditions frame-by-frame.

#### Acceptance Criteria

1. THE Dashboard SHALL display three video players side-by-side showing Reference Tyre Video, Damaged Tyre Video, and Difference Video
2. THE Dashboard SHALL generate the Difference Video with edge detection, crack overlay, and frame-to-frame delta visualization
3. THE Dashboard SHALL apply a depth color map (blue for shallow, red for deep) to the Difference Video
4. WHEN the play button is clicked, THE Dashboard SHALL synchronize playback of all three videos simultaneously
5. WHEN the pause button is clicked, THE Dashboard SHALL pause all three videos at the same timestamp
6. THE Dashboard SHALL provide frame-by-frame stepping controls that advance all three videos by one frame
7. THE Dashboard SHALL provide a timeline scrubber that seeks all three videos to the selected timestamp when dragged

### Requirement 7

**User Story:** As a pit stop inspection team member, I want to synchronize the 3D model rotation with video playback, so that I can correlate visual damage with the 3D reconstruction.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a "Sync with Video Timeline" toggle in the 3D Renderer controls
2. WHEN "Sync with Video Timeline" is enabled and videos are playing, THE 3D Renderer SHALL rotate the model to match the tyre orientation in the current video frame
3. WHEN the video timeline scrubber is moved, THE 3D Renderer SHALL update the model rotation to match the selected frame orientation

### Requirement 8

**User Story:** As a pit stop inspection team member, I want to download a comprehensive inspection report, so that I can share findings with the team and maintain records.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a download button in the navigation bar
2. WHEN the download button is clicked, THE Dashboard SHALL generate an Inspection Report containing the Crack Map, Depth Map, Severity Score, and a 3D reconstruction snapshot
3. WHEN the Inspection Report is generated, THE Dashboard SHALL initiate a file download to the user's device

### Requirement 9

**User Story:** As a pit stop inspection team member, I want the interface to use high-contrast colors, so that I can quickly identify critical information in fast-paced pit stop conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL use Ferrari Red (#FF1801) for call-to-action buttons and highlights
2. THE Dashboard SHALL use Black (#000000) for the primary background
3. THE Dashboard SHALL use Soft White (#F5F5F5) for text content
4. THE Dashboard SHALL use Graphite Grey (#1A1A1A) for panel backgrounds
5. THE Dashboard SHALL use Formula-style bold sans-serif fonts (Audiowide, Orbitron, or Poppins)

### Requirement 10

**User Story:** As a pit stop inspection team member, I want to access team information, so that I can contact the development team if needed.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a "Meet the Team" link in the navigation bar
2. WHEN the "Meet the Team" link is clicked, THE Dashboard SHALL display team member information
