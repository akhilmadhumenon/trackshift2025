import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadPanel from './UploadPanel';
import * as videoValidation from '../utils/videoValidation';

// Mock the video validation module
vi.mock('../utils/videoValidation', () => ({
  validateVideoAngle: vi.fn(),
}));

describe('UploadPanel', () => {
  const mockOnReferenceUpload = vi.fn();
  const mockOnDamagedUpload = vi.fn();
  const mockOnReconstruct = vi.fn();

  const defaultProps = {
    onReferenceUpload: mockOnReferenceUpload,
    onDamagedUpload: mockOnDamagedUpload,
    onReconstruct: mockOnReconstruct,
    isProcessing: false,
    processingProgress: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation for video validation
    vi.mocked(videoValidation.validateVideoAngle).mockResolvedValue({
      isValid: true,
      confidence: 0.85,
      angle: 88.5,
      message: 'Valid top-down angle detected (85% confidence)',
    });

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('Drag and Drop Functionality', () => {
    it('should render upload zones for reference and damaged videos', () => {
      render(<UploadPanel {...defaultProps} />);

      expect(screen.getByText(/Reference Tyre Video/i)).toBeInTheDocument();
      expect(screen.getByText(/Damaged Tyre Video/i)).toBeInTheDocument();
    });

    it('should handle drag enter event and show visual feedback', async () => {
      render(<UploadPanel {...defaultProps} />);

      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      expect(referenceZone).not.toHaveClass('border-ferrari-red');

      fireEvent.dragEnter(referenceZone!);

      await waitFor(() => {
        expect(referenceZone).toHaveClass('border-ferrari-red');
      });
    });

    it('should handle drag leave event and remove visual feedback', async () => {
      render(<UploadPanel {...defaultProps} />);

      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      fireEvent.dragEnter(referenceZone!);
      await waitFor(() => {
        expect(referenceZone).toHaveClass('border-ferrari-red');
      });

      fireEvent.dragLeave(referenceZone!);

      await waitFor(() => {
        expect(referenceZone).not.toHaveClass('border-ferrari-red');
      });
    });

    it('should handle file drop and trigger validation', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(videoValidation.validateVideoAngle).toHaveBeenCalledWith(mockFile);
      });
    });

    it('should only accept video files on drop', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['image content'], 'test-image.jpg', { type: 'image/jpeg' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(videoValidation.validateVideoAngle).not.toHaveBeenCalled();
      });
    });
  });

  describe('File Type Validation', () => {
    it('should accept video files through file input', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      
      // Find the hidden file input directly
      const fileInputs = document.querySelectorAll('input[type="file"]');
      const referenceInput = fileInputs[0] as HTMLInputElement;

      // Simulate file selection
      Object.defineProperty(referenceInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(referenceInput);

      await waitFor(() => {
        expect(videoValidation.validateVideoAngle).toHaveBeenCalledWith(mockFile);
      });
    });

    it('should display uploaded file name and size', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['x'.repeat(1024 * 1024 * 5)], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
        expect(screen.getByText(/5\.00 MB/i)).toBeInTheDocument();
      });
    });

    it('should show video preview after upload', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        // Check for video element by querying the DOM
        const videoElements = document.querySelectorAll('video');
        expect(videoElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Angle Validation Logic', () => {
    it('should show validation loading state', async () => {
      // Mock validation to take some time
      vi.mocked(videoValidation.validateVideoAngle).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          isValid: true,
          confidence: 0.85,
          angle: 88.5,
          message: 'Valid top-down angle detected',
        }), 100))
      );

      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText(/Validating angle/i)).toBeInTheDocument();
      });
    });

    it('should display success message for valid angle', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText(/Valid top-down angle detected/i)).toBeInTheDocument();
        expect(screen.getByText(/Estimated angle: 88\.5°/i)).toBeInTheDocument();
      });
    });

    it('should display error message for invalid angle', async () => {
      vi.mocked(videoValidation.validateVideoAngle).mockResolvedValue({
        isValid: false,
        confidence: 0.45,
        angle: 65.0,
        message: 'Invalid camera angle. Please ensure video is captured at 90° top-down view',
      });

      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText(/Invalid camera angle/i)).toBeInTheDocument();
        expect(screen.getByText(/Estimated angle: 65\.0°/i)).toBeInTheDocument();
      });
    });

    it('should provide retry option for invalid angle', async () => {
      vi.mocked(videoValidation.validateVideoAngle).mockResolvedValue({
        isValid: false,
        confidence: 0.45,
        angle: 65.0,
        message: 'Invalid camera angle',
      });

      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText(/Upload Different Video/i)).toBeInTheDocument();
      });
    });
  });

  describe('Metadata Collection', () => {
    it('should show metadata fields after file upload', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText(/Reference Tyre Metadata/i)).toBeInTheDocument();
        expect(screen.getByText(/Tyre Type \*/i)).toBeInTheDocument();
        expect(screen.getByText(/Compound \*/i)).toBeInTheDocument();
        expect(screen.getByText(/Laps Used/i)).toBeInTheDocument();
      });
    });

    it('should allow entering tyre type', async () => {
      const user = userEvent.setup();
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText(/Reference Tyre Metadata/i)).toBeInTheDocument();
      });

      const tyreTypeInput = screen.getByPlaceholderText(/Front Left, Rear Right/i) as HTMLInputElement;
      await user.type(tyreTypeInput, 'Front Left');

      expect(tyreTypeInput.value).toBe('Front Left');
    });

    it('should allow selecting compound from dropdown', async () => {
      const user = userEvent.setup();
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText(/Reference Tyre Metadata/i)).toBeInTheDocument();
      });

      const compoundSelects = screen.getAllByRole('combobox');
      const compoundSelect = compoundSelects[0] as HTMLSelectElement;
      await user.selectOptions(compoundSelect, 'C3');

      expect(compoundSelect.value).toBe('C3');
    });

    it('should allow entering laps used', async () => {
      const user = userEvent.setup();
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
        },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText(/Reference Tyre Metadata/i)).toBeInTheDocument();
      });

      const lapsInputs = screen.getAllByRole('spinbutton');
      const lapsInput = lapsInputs[0] as HTMLInputElement;
      await user.clear(lapsInput);
      await user.type(lapsInput, '15');

      expect(lapsInput.value).toBe('15');
    });

    it('should show metadata fields for both reference and damaged videos', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile1 = new File(['video content'], 'reference.mp4', { type: 'video/mp4' });
      const mockFile2 = new File(['video content'], 'damaged.mp4', { type: 'video/mp4' });
      
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');
      const damagedZone = uploadZones[1].closest('div[class*="border-2"]');

      // Upload reference video
      const dropEvent1 = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent1, 'dataTransfer', {
        value: { files: [mockFile1] },
      });
      fireEvent(referenceZone!, dropEvent1);

      await waitFor(() => {
        expect(screen.getByText(/Reference Tyre Metadata/i)).toBeInTheDocument();
      });

      // Upload damaged video
      const dropEvent2 = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent2, 'dataTransfer', {
        value: { files: [mockFile2] },
      });
      fireEvent(damagedZone!, dropEvent2);

      await waitFor(() => {
        expect(screen.getByText(/Damaged Tyre Metadata/i)).toBeInTheDocument();
      });

      // Should have metadata fields for both videos
      const tyreTypeInputs = screen.getAllByPlaceholderText(/Front Left, Rear Right/i);
      expect(tyreTypeInputs).toHaveLength(2);
    });
  });

  describe('Reconstruct Button', () => {
    it('should be disabled when no videos are uploaded', () => {
      render(<UploadPanel {...defaultProps} />);

      const reconstructButton = screen.getByRole('button', { name: /Reconstruct 3D Model/i });
      expect(reconstructButton).toBeDisabled();
    });

    it('should be disabled when only one video is uploaded', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');

      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [mockFile] },
      });

      fireEvent(referenceZone!, dropEvent);

      await waitFor(() => {
        expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
      });

      const reconstructButton = screen.getByRole('button', { name: /Reconstruct 3D Model/i });
      expect(reconstructButton).toBeDisabled();
    });

    it('should be disabled when metadata is incomplete', async () => {
      render(<UploadPanel {...defaultProps} />);

      const mockFile1 = new File(['video content'], 'reference.mp4', { type: 'video/mp4' });
      const mockFile2 = new File(['video content'], 'damaged.mp4', { type: 'video/mp4' });
      
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');
      const damagedZone = uploadZones[1].closest('div[class*="border-2"]');

      // Upload both videos
      const dropEvent1 = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent1, 'dataTransfer', {
        value: { files: [mockFile1] },
      });
      fireEvent(referenceZone!, dropEvent1);

      const dropEvent2 = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent2, 'dataTransfer', {
        value: { files: [mockFile2] },
      });
      fireEvent(damagedZone!, dropEvent2);

      await waitFor(() => {
        expect(screen.getByText('reference.mp4')).toBeInTheDocument();
        expect(screen.getByText('damaged.mp4')).toBeInTheDocument();
      });

      const reconstructButton = screen.getByRole('button', { name: /Reconstruct 3D Model/i });
      expect(reconstructButton).toBeDisabled();
    });

    it('should be enabled when both videos are uploaded with valid metadata', async () => {
      const user = userEvent.setup();
      render(<UploadPanel {...defaultProps} />);

      const mockFile1 = new File(['video content'], 'reference.mp4', { type: 'video/mp4' });
      const mockFile2 = new File(['video content'], 'damaged.mp4', { type: 'video/mp4' });
      
      const uploadZones = screen.getAllByText(/Click to upload/i);
      const referenceZone = uploadZones[0].closest('div[class*="border-2"]');
      const damagedZone = uploadZones[1].closest('div[class*="border-2"]');

      // Upload both videos
      const dropEvent1 = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent1, 'dataTransfer', {
        value: { files: [mockFile1] },
      });
      fireEvent(referenceZone!, dropEvent1);

      const dropEvent2 = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent2, 'dataTransfer', {
        value: { files: [mockFile2] },
      });
      fireEvent(damagedZone!, dropEvent2);

      await waitFor(() => {
        expect(screen.getByText('reference.mp4')).toBeInTheDocument();
        expect(screen.getByText('damaged.mp4')).toBeInTheDocument();
      });

      // Fill in metadata for reference video
      const tyreTypeInputs = screen.getAllByPlaceholderText(/Front Left, Rear Right/i);
      await user.type(tyreTypeInputs[0], 'Front Left');
      
      const compoundSelects = screen.getAllByRole('combobox');
      await user.selectOptions(compoundSelects[0], 'C3');

      // Fill in metadata for damaged video
      await user.type(tyreTypeInputs[1], 'Front Left');
      await user.selectOptions(compoundSelects[1], 'C3');

      await waitFor(() => {
        const reconstructButton = screen.getByRole('button', { name: /Reconstruct 3D Model/i });
        expect(reconstructButton).not.toBeDisabled();
      });
    });

    it('should show processing state when isProcessing is true', () => {
      render(<UploadPanel {...defaultProps} isProcessing={true} processingProgress={45} />);

      expect(screen.getByText(/Processing\.\.\. 45%/i)).toBeInTheDocument();
    });
  });
});
