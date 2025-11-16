import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './Navbar';

describe('Navbar', () => {
  it('should render download button as disabled when report is not ready', () => {
    const mockMeetTeamClick = vi.fn();
    const mockAnalyticsClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onAnalyticsClick={mockAnalyticsClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={false}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /report not ready/i });
    expect(downloadButton).toBeDisabled();
  });

  it('should render download button as enabled when report is ready', () => {
    const mockMeetTeamClick = vi.fn();
    const mockAnalyticsClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onAnalyticsClick={mockAnalyticsClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={true}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /download inspection report/i });
    expect(downloadButton).not.toBeDisabled();
  });

  it('should call onDownloadReport when download button is clicked', () => {
    const mockMeetTeamClick = vi.fn();
    const mockAnalyticsClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onAnalyticsClick={mockAnalyticsClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={true}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /download inspection report/i });
    fireEvent.click(downloadButton);

    expect(mockDownloadReport).toHaveBeenCalledTimes(1);
  });

  it('should show downloading state when isDownloading is true', () => {
    const mockMeetTeamClick = vi.fn();
    const mockAnalyticsClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onAnalyticsClick={mockAnalyticsClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={true}
        isDownloading={true}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /downloading report/i });
    expect(downloadButton).toBeDisabled();
  });

  it('should disable download button when downloading', () => {
    const mockMeetTeamClick = vi.fn();
    const mockAnalyticsClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onAnalyticsClick={mockAnalyticsClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={true}
        isDownloading={true}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /downloading report/i });
    fireEvent.click(downloadButton);

    // Should not call the handler when disabled
    expect(mockDownloadReport).not.toHaveBeenCalled();
  });

  it('should render "Meet the Team" link', () => {
    const mockMeetTeamClick = vi.fn();
    const mockAnalyticsClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onAnalyticsClick={mockAnalyticsClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={false}
      />
    );

    const meetTeamLink = screen.getByRole('button', { name: /meet the team/i });
    expect(meetTeamLink).toBeInTheDocument();
  });

  it('should call onMeetTeamClick when "Meet the Team" link is clicked', () => {
    const mockMeetTeamClick = vi.fn();
    const mockAnalyticsClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onAnalyticsClick={mockAnalyticsClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={false}
      />
    );

    const meetTeamLink = screen.getByRole('button', { name: /meet the team/i });
    fireEvent.click(meetTeamLink);

    expect(mockMeetTeamClick).toHaveBeenCalledTimes(1);
  });

  it('should render "Analytics" link', () => {
    const mockMeetTeamClick = vi.fn();
    const mockAnalyticsClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onAnalyticsClick={mockAnalyticsClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={false}
      />
    );

    const analyticsLink = screen.getByRole('button', { name: /view analytics/i });
    expect(analyticsLink).toBeInTheDocument();
  });

  it('should call onAnalyticsClick when "Analytics" link is clicked', () => {
    const mockMeetTeamClick = vi.fn();
    const mockAnalyticsClick = vi.fn();
    const mockDownloadReport = vi.fn();

    render(
      <Navbar
        onMeetTeamClick={mockMeetTeamClick}
        onAnalyticsClick={mockAnalyticsClick}
        onDownloadReport={mockDownloadReport}
        isReportReady={false}
      />
    );

    const analyticsLink = screen.getByRole('button', { name: /view analytics/i });
    fireEvent.click(analyticsLink);

    expect(mockAnalyticsClick).toHaveBeenCalledTimes(1);
  });
});
