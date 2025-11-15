def process_video(self):
    """Main processing pipeline with 3 separate output videos"""
    self.logger.info(f"Starting analysis of {self.video_path}")
    
    # Open video
    cap = cv2.VideoCapture(str(self.video_path))
    if not cap.isOpened():
        self.logger.error("Failed to open video")
        return
    
    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    self.logger.info(f"Video: {width}x{height} @ {fps}fps, {total_frames} frames")
    
    # Split frames into 3 parts
    split_points = [total_frames // 3, 2 * total_frames // 3, total_frames]
    
    # Setup three output videos
    video_writers = []
    for i in range(3):
        out_path = self.output_dir / f'annotated_video_part{i+1}.mp4'
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(str(out_path), fourcc, fps, (width, height))
        video_writers.append(writer)
    
    frame_idx = 0
    total_damages = 0
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Detect damages
            crack_mask, damage_info = self.detect_cracks(frame, frame_idx)
            
            # Estimate depth
            depth_map = self.estimate_depth(frame, crack_mask)
            
            # Create visualization
            vis_frame = self.create_visualization(
                frame, crack_mask, depth_map, damage_info
            )
            
            # Determine which video writer to use
            if frame_idx < split_points[0]:
                writer_idx = 0
            elif frame_idx < split_points[1]:
                writer_idx = 1
            else:
                writer_idx = 2
                
            video_writers[writer_idx].write(vis_frame)
            
            # Store damage info if any detected
            if damage_info['damages']:
                self.damages.append(damage_info)
                total_damages += len(damage_info['damages'])
                self.logger.info(
                    f"Frame {frame_idx}: {len(damage_info['damages'])} damages detected"
                )
            
            frame_idx += 1
            
            # Progress update
            if frame_idx % 30 == 0:
                progress = (frame_idx / total_frames) * 100
                self.logger.info(f"Progress: {progress:.1f}%")
                
    finally:
        cap.release()
        for writer in video_writers:
            writer.release()
    
    self.logger.info(f"Processing complete. Total damages: {total_damages}")
    self.logger.info(f"Annotated videos saved to: {self.output_dir}")
    
    # Generate reports
    self.generate_reports()
