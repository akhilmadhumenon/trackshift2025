import React from 'react';
import { StintAnalysis } from '../../types/analytics';

interface DataTableProps {
  stintData: StintAnalysis;
  driverName: string;
  raceName: string;
  year: number;
}

const DataTable: React.FC<DataTableProps> = ({
  stintData,
  driverName,
  raceName,
  year,
}) => {
  // Round numeric values to 3 decimal places
  const formatNumber = (value: number): string => {
    return value.toFixed(3);
  };

  // Generate CSV content from table data
  const generateCSV = (): string => {
    const headers = [
      'Lap Number',
      'Tyre Life',
      'Lap Time',
      'Enhanced Degradation',
      'Simple Degradation',
      'Fuel Correction',
      'Predicted Degradation',
      'Speed Mean',
      'Throttle Mean',
      'Brake Percent',
      'RPM Mean',
    ];

    const rows = stintData.laps.map(lap => [
      lap.lapNumber,
      lap.tyreLife,
      lap.lapTimeFormatted,
      formatNumber(lap.enhancedDegradation),
      formatNumber(lap.simpleDegradation),
      formatNumber(lap.fuelCorrection),
      formatNumber(lap.predictedDegradation),
      formatNumber(lap.telemetry.speedMean),
      formatNumber(lap.telemetry.throttleMean),
      formatNumber(lap.telemetry.brakePercent),
      formatNumber(lap.telemetry.rpmMean),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    return csvContent;
  };

  // Trigger CSV download
  const handleDownloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Format filename: {Driver}_{Race}_{Year}_stint{Stint}.csv
    const filename = `${driverName}_${raceName}_${year}_stint${stintData.stintNumber}.csv`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 bg-ferrari-black">
      <div className="mb-4">
        <h3 className="text-ferrari-white text-xl font-semibold">
          Lap-by-Lap Data
        </h3>
        <p className="text-ferrari-white/70 text-sm">
          Detailed stint analysis for {driverName} - Stint {stintData.stintNumber}
        </p>
        <p className="text-ferrari-white/50 text-xs mt-2" id="table-description">
          This table provides an accessible alternative to the charts above, showing detailed lap-by-lap performance data.
        </p>
      </div>

      {/* Table Container with horizontal scroll support */}
      <div 
        className="overflow-x-auto rounded-lg border border-ferrari-graphite"
        role="region"
        aria-labelledby="table-title"
        aria-describedby="table-description"
        tabIndex={0}
      >
        <table 
          className="w-full min-w-max"
          id="table-title"
          aria-label={`Lap-by-lap data for ${driverName}, stint ${stintData.stintNumber}`}
        >
          {/* Sticky Header */}
          <thead className="bg-ferrari-graphite text-ferrari-white sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                Lap Number
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                Tyre Life
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                Lap Time
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                <abbr title="Enhanced Degradation">Enhanced Deg.</abbr>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                <abbr title="Simple Degradation">Simple Deg.</abbr>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                <abbr title="Fuel Correction">Fuel Corr.</abbr>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                <abbr title="Predicted Degradation">Predicted Deg.</abbr>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                Speed Mean
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                Throttle Mean
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                Brake %
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold border-b border-ferrari-black">
                RPM Mean
              </th>
            </tr>
          </thead>

          {/* Table Body with alternating row colors */}
          <tbody>
            {stintData.laps.map((lap, index) => (
              <tr
                key={lap.lapNumber}
                className={`
                  ${index % 2 === 0 ? 'bg-ferrari-black' : 'bg-ferrari-graphite/50'}
                  hover:bg-ferrari-red/10 transition-colors duration-150
                  text-ferrari-white
                `}
              >
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {lap.lapNumber}
                </td>
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {lap.tyreLife}
                </td>
                <td className="px-4 py-3 text-sm font-mono border-b border-ferrari-graphite/30">
                  {lap.lapTimeFormatted}
                </td>
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {formatNumber(lap.enhancedDegradation)}s
                </td>
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {formatNumber(lap.simpleDegradation)}s
                </td>
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {formatNumber(lap.fuelCorrection)}s
                </td>
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {formatNumber(lap.predictedDegradation)}s
                </td>
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {formatNumber(lap.telemetry.speedMean)} km/h
                </td>
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {formatNumber(lap.telemetry.throttleMean)}%
                </td>
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {formatNumber(lap.telemetry.brakePercent)}%
                </td>
                <td className="px-4 py-3 text-sm border-b border-ferrari-graphite/30">
                  {formatNumber(lap.telemetry.rpmMean)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CSV Export Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleDownloadCSV}
          className="
            px-6 py-3 
            bg-ferrari-red text-ferrari-white 
            font-semibold text-sm 
            rounded-lg 
            hover:bg-ferrari-red/80 
            active:bg-ferrari-red/70
            focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-black
            transition-all duration-200
            flex items-center gap-2
            min-h-[44px] touch-manipulation
          "
          aria-label={`Download stint data as CSV for ${driverName}, ${raceName} ${year}, stint ${stintData.stintNumber}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download Data as CSV
        </button>
      </div>
    </div>
  );
};

export default DataTable;
