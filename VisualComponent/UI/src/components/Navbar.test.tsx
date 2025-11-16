import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './Navbar';

describe('Navbar', () => {
  it('should render download button as disabled when report is not ready', () => {
    const mockMeetTeamClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={false}
      />
    );

    const downloadButton = screen.getByText('Download Report');
    expect(downloadButton).toBeDisabled();
  });

  it('should render download button as enabled when report is ready', () => {
    const mockMeetTeamClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={true}
      />
    );

    const downloadButton = screen.getByText('Download Report');
    expect(downloadButton).not.toBeDisabled();
  });

  it('should call onDownloadReport when download button is clicked', () => {
    const mockMeetTeamClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={true}
      />
    );

    const downloadButton = screen.getByText('Download Report');
    fireEvent.click(downloadButton);

    expect(mockDownloadReport).toHaveBeenCalledTimes(1);
  });

  it('should show downloading state when isDownloading is true', () => {
    const mockMeetTeamClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={true}
        isDownloading={true}
      />
    );

    const downloadButton = screen.getByText('Downloading...');
    expect(downloadButton).toBeDisabled();
  });

  it('should disable download button when downloading', () => {
    const mockMeetTeamClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={true}
        isDownloading={true}
      />
    );

    const downloadButton = screen.getByText('Downloading...');
    fireEvent.click(downloadButton);

    // Should not call the handler when disabled
    expect(mockDownloadReport).not.toHaveBeenCalled();
  });

  it('should render "Meet the Team" link', () => {
    const mockMeetTeamClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={false}
      />
    );

    const meetTeamLink = screen.getByText('Meet the Team');
    expect(meetTeamLink).toBeInTheDocument();
  });

  it('should call onMeetTeamClick when "Meet the Team" link is clicked', () => {
    const mockMeetTeamClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={false}
      />
    );

    const meetTeamLink = screen.getByText('Meet the Team');
    fireEvent.click(meetTeamLink);

    expect(mockMeetTeamClick).toHaveBeenCalledTimes(1);
  });
});
