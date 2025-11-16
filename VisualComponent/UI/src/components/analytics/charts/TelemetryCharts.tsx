import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TelemetryStats } from '../../../types/analytics';

interface TelemetryChartsProps {
  data: TelemetryStats[];
}

const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ data }) => {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-ferrari-graphite border border-ferrari-red p-3 rounded shadow-lg">
          <p className="text-ferrari-white font-semibold mb-2">
            Lap {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.value.toFixed(1)}{entry.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Common chart configuration
  const chartMargin = { top: 10, right: 30, left: 20, bottom: 20 };

  return (
    <div className="w-full h-full bg-ferrari-black p-2 sm:p-4">
      <div className="mb-4">
        <h3 className="text-ferrari-white text-lg sm:text-xl font-semibold">
          Telemetry Analysis
        </h3>
        <p className="text-ferrari-white/70 text-xs sm:text-sm">
          Driving style and performance metrics throughout the stint
        </p>
      </div>

      {/* Responsive Grid Layout: 1 column on mobile, 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Speed Profile Chart */}
        <div className="bg-ferrari-graphite p-3 sm:p-4 rounded">
          <h4 className="text-ferrari-white text-sm font-semibold mb-2">
            Speed Profile
          </h4>
          <ResponsiveContainer width="100%" height={250} minWidth={250}>
            <LineChart data={data} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="tyreLife"
                stroke="#F5F5F5"
                label={{
                  value: 'Tyre Life (Laps)',
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#F5F5F5',
                  fontSize: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#F5F5F5"
                label={{
                  value: 'Speed (km/h)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#F5F5F5',
                  fontSize: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={(props) => (
                  <CustomTooltip
                    {...props}
                    payload={props.payload?.map((p: any) => ({
                      ...p,
                      unit: ' km/h',
                    }))}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="speedMean"
                stroke="#00CED1"
                strokeWidth={2}
                dot={{ fill: '#00CED1', r: 3 }}
                name="Avg Speed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Throttle Usage Chart */}
        <div className="bg-ferrari-graphite p-3 sm:p-4 rounded">
          <h4 className="text-ferrari-white text-sm font-semibold mb-2">
            Throttle Usage
          </h4>
          <ResponsiveContainer width="100%" height={250} minWidth={250}>
            <LineChart data={data} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="tyreLife"
                stroke="#F5F5F5"
                label={{
                  value: 'Tyre Life (Laps)',
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#F5F5F5',
                  fontSize: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#F5F5F5"
                label={{
                  value: 'Throttle (%)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#F5F5F5',
                  fontSize: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={(props) => (
                  <CustomTooltip
                    {...props}
                    payload={props.payload?.map((p: any) => ({
                      ...p,
                      unit: '%',
                    }))}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="throttleMean"
                stroke="#00FF00"
                strokeWidth={2}
                dot={{ fill: '#00FF00', r: 3 }}
                name="Avg Throttle"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Braking Intensity Chart */}
        <div className="bg-ferrari-graphite p-3 sm:p-4 rounded">
          <h4 className="text-ferrari-white text-sm font-semibold mb-2">
            Braking Intensity
          </h4>
          <ResponsiveContainer width="100%" height={250} minWidth={250}>
            <LineChart data={data} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="tyreLife"
                stroke="#F5F5F5"
                label={{
                  value: 'Tyre Life (Laps)',
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#F5F5F5',
                  fontSize: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#F5F5F5"
                label={{
                  value: 'Brake (%)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#F5F5F5',
                  fontSize: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={(props) => (
                  <CustomTooltip
                    {...props}
                    payload={props.payload?.map((p: any) => ({
                      ...p,
                      unit: '%',
                    }))}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="brakePercent"
                stroke="#FF1801"
                strokeWidth={2}
                dot={{ fill: '#FF1801', r: 3 }}
                name="Brake Usage"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Engine RPM Chart */}
        <div className="bg-ferrari-graphite p-3 sm:p-4 rounded">
          <h4 className="text-ferrari-white text-sm font-semibold mb-2">
            Engine RPM
          </h4>
          <ResponsiveContainer width="100%" height={250} minWidth={250}>
            <LineChart data={data} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="tyreLife"
                stroke="#F5F5F5"
                label={{
                  value: 'Tyre Life (Laps)',
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#F5F5F5',
                  fontSize: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#F5F5F5"
                label={{
                  value: 'RPM',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#F5F5F5',
                  fontSize: 12,
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={(props) => (
                  <CustomTooltip
                    {...props}
                    payload={props.payload?.map((p: any) => ({
                      ...p,
                      unit: '',
                    }))}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="rpmMean"
                stroke="#FFA500"
                strokeWidth={2}
                dot={{ fill: '#FFA500', r: 3 }}
                name="Avg RPM"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TelemetryCharts;
