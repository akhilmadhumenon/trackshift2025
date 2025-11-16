import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MeetTheTeamModal from './MeetTheTeamModal';

describe('MeetTheTeamModal', () => {
  it('should not render when isOpen is false', () => {
    const mockOnClose = vi.fn();

    const { container } = render(
      <MeetTheTeamModal isOpen={false} onClose={mockOnClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    const mockOnClose = vi.fn();

    render(<MeetTheTeamModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('MEET THE TEAM')).toBeInTheDocument();
  });

  it('should call onClose when X button is clicked', () => {
    const mockOnClose = vi.fn();

    render(<MeetTheTeamModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when CLOSE button is clicked', () => {
    const mockOnClose = vi.fn();

    render(<MeetTheTeamModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByText('CLOSE');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render all team members', () => {
    const mockOnClose = vi.fn();

    render(<MeetTheTeamModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument();
    expect(screen.getByText('Marcus Rodriguez')).toBeInTheDocument();
    expect(screen.getByText('Emily Watson')).toBeInTheDocument();
    expect(screen.getByText('James Park')).toBeInTheDocument();
    expect(screen.getByText('Dr. Aisha Patel')).toBeInTheDocument();
    expect(screen.getByText('Thomas Müller')).toBeInTheDocument();
  });

  it('should render team member roles', () => {
    const mockOnClose = vi.fn();

    render(<MeetTheTeamModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Lead Computer Vision Engineer')).toBeInTheDocument();
    expect(screen.getByText('Senior 3D Reconstruction Specialist')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
  });

  it('should render general inquiries section', () => {
    const mockOnClose = vi.fn();

    render(<MeetTheTeamModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('GENERAL INQUIRIES')).toBeInTheDocument();
    expect(screen.getByText('Technical Support')).toBeInTheDocument();
    expect(screen.getByText('Business Inquiries')).toBeInTheDocument();
  });
});
