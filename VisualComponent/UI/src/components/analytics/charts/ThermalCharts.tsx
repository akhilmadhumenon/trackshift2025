import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ThermalData } from '../../../types/analytics';

interface ThermalChartsProps {
  data: ThermalData[];
}

const ThermalCharts: React.FC<ThermalChartsProps> = ({ data }) => {
  // Check if data is available
  const hasData = data && data.length > 0;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-ferrari-graphite border border-ferrari-red p-3 rounded shadow-lg max-h-64 overflow-y-auto">
          <p className="text-ferrari-white font-semibold mb-2">
            Lap {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-xs"
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

  if (!hasData) {
    return (
      <div className="w-full h-full bg-ferrari-black p-2 sm:p-4">
        <div className="mb-4">
          <h3 className="text-ferrari-white text-lg sm:text-xl font-semibold">
            Thermal Data Analysis
          </h3>
        </div>
        <div className="bg-ferrari-graphite p-6 sm:p-8 rounded text-center">
          <p className="text-ferrari-white/70 text-lg mb-2">
            ℹ️ Sensor Data Unavailable
          </p>
          <p className="text-ferrari-white/50 text-sm">
            Thermal sensor data is not available for this stint. This data is synthetically generated
            based on telemetry patterns and may not be available for all sessions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-ferrari-black p-2 sm:p-4">
      <div className="mb-4">
        <h3 className="text-ferrari-white text-lg sm:text-xl font-semibold">
          Thermal Data Analysis
        </h3>
        <p className="text-ferrari-white/70 text-xs sm:text-sm">
          Temperature monitoring across tyres, brakes, and power unit components
        </p>
      </div>

      {/* Grid Layout for Charts */}
      <div className="space-y-4 sm:space-y-6">
        {/* Tyre Temperatures Chart */}
        <div className="bg-ferrari-graphite p-3 sm:p-4 rounded">
          <h4 className="text-ferrari-white text-sm font-semibold mb-2">
            Tyre Temperatures
          </h4>
          <ResponsiveContainer width="100%" height={280} minWidth={300}>
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
                  value: 'Temperature (°C)',
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
                      unit: '°C',
                    }))}
                  />
                )}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="tyreTempFL"
                stroke="#FF6B6B"
                strokeWidth={2}
                dot={false}
                name="Front Left"
              />
              <Line
                type="monotone"
                dataKey="tyreTempFR"
                stroke="#FF1801"
                strokeWidth={2}
                dot={false}
                name="Front Right"
              />
              <Line
                type="monotone"
                dataKey="tyreTempRL"
                stroke="#FFA500"
                strokeWidth={2}
                dot={false}
                name="Rear Left"
              />
              <Line
                type="monotone"
                dataKey="tyreTempRR"
                stroke="#FFD700"
                strokeWidth={2}
                dot={false}
                name="Rear Right"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Brake Temperatures Chart */}
        <div className="bg-ferrari-graphite p-3 sm:p-4 rounded">
          <h4 className="text-ferrari-white text-sm font-semibold mb-2">
            Brake Temperatures
          </h4>
          <ResponsiveContainer width="100%" height={280} minWidth={300}>
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
                  value: 'Temperature (°C)',
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
                      unit: '°C',
                    }))}
                  />
                )}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="brakeTempFL"
                stroke="#DC143C"
                strokeWidth={2}
                dot={false}
                name="Front Left"
              />
              <Line
                type="monotone"
                dataKey="brakeTempFR"
                stroke="#8B0000"
                strokeWidth={2}
                dot={false}
                name="Front Right"
              />
              <Line
                type="monotone"
                dataKey="brakeTempRL"
                stroke="#FF4500"
                strokeWidth={2}
                dot={false}
                name="Rear Left"
              />
              <Line
                type="monotone"
                dataKey="brakeTempRR"
                stroke="#FF6347"
                strokeWidth={2}
                dot={false}
                name="Rear Right"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ERS & Battery Chart */}
        <div className="bg-ferrari-graphite p-3 sm:p-4 rounded">
          <h4 className="text-ferrari-white text-sm font-semibold mb-2">
            ERS & Battery
          </h4>
          <ResponsiveContainer width="100%" height={280} minWidth={300}>
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
                  value: 'Percentage (%)',
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
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="ersDeploymentRatio"
                stroke="#00FF00"
                strokeWidth={2}
                dot={false}
                name="ERS Deployment"
              />
              <Line
                type="monotone"
                dataKey="batterySoc"
                stroke="#00CED1"
                strokeWidth={2}
                dot={false}
                name="Battery SOC"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Power Unit Temperatures Chart */}
        <div className="bg-ferrari-graphite p-3 sm:p-4 rounded">
          <h4 className="text-ferrari-white text-sm font-semibold mb-2">
            Power Unit Temperatures
          </h4>
          <ResponsiveContainer width="100%" height={280} minWidth={300}>
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
                  value: 'Temperature (°C)',
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
                      unit: '°C',
                    }))}
                  />
                )}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="iceTemperature"
                stroke="#FF1801"
                strokeWidth={2}
                dot={false}
                name="ICE"
              />
              <Line
                type="monotone"
                dataKey="oilTemp"
                stroke="#FFA500"
                strokeWidth={2}
                dot={false}
                name="Oil"
              />
              <Line
                type="monotone"
                dataKey="coolantTemp"
                stroke="#00CED1"
                strokeWidth={2}
                dot={false}
                name="Coolant"
              />
              <Line
                type="monotone"
                dataKey="mguhTemp"
                stroke="#9370DB"
                strokeWidth={2}
                dot={false}
                name="MGU-H"
              />
              <Line
                type="monotone"
                dataKey="mgukTemp"
                stroke="#FF69B4"
                strokeWidth={2}
                dot={false}
                name="MGU-K"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ThermalCharts;
