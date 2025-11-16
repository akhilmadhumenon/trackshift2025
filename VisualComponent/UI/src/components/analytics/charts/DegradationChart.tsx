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
  ReferenceLine,
} from 'recharts';
import { DegradationPoint } from '../../../types/analytics';

interface DegradationChartProps {
  data: DegradationPoint[];
  driverName: string;
  compound: string;
  showSimple: boolean;
}

const DegradationChart: React.FC<DegradationChartProps> = ({
  data,
  driverName,
  compound,
  showSimple,
}) => {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const tyreLife = payload[0].payload.tyreLife;
      return (
        <div className="bg-ferrari-graphite border border-ferrari-red p-3 rounded shadow-lg">
          <p className="text-ferrari-white font-semibold mb-2">
            Lap {tyreLife}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.value.toFixed(3)}s
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full bg-ferrari-black p-2 sm:p-4">
      <div className="mb-4">
        <h3 className="text-ferrari-white text-lg sm:text-xl font-semibold">
          Tyre Degradation Analysis
        </h3>
        <p className="text-ferrari-white/70 text-xs sm:text-sm">
          {driverName} - {compound} Compound
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={400} minWidth={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="tyreLife"
            stroke="#F5F5F5"
            label={{
              value: 'Tyre Life (Laps)',
              position: 'insideBottom',
              offset: -5,
              fill: '#F5F5F5',
            }}
          />
          <YAxis
            stroke="#F5F5F5"
            label={{
              value: 'Degradation (seconds)',
              angle: -90,
              position: 'insideLeft',
              fill: '#F5F5F5',
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#F5F5F5' }}
            iconType="line"
          />
          
          {/* Critical threshold line at 2.0 seconds */}
          <ReferenceLine
            y={2.0}
            stroke="#FFD700"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: 'Critical Threshold (2.0s)',
              fill: '#FFD700',
              position: 'right',
            }}
          />
          
          {/* Actual degradation - solid red line with markers */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#FF1801"
            strokeWidth={2}
            dot={{ fill: '#FF1801', r: 4 }}
            name="Actual Degradation"
            activeDot={{ r: 6 }}
          />
          
          {/* Predicted degradation - dashed cyan line */}
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#00CED1"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Predicted Degradation"
          />
          
          {/* Optional simple degradation - dotted orange line */}
          {showSimple && (
            <Line
              type="monotone"
              dataKey="simple"
              stroke="#FFA500"
              strokeWidth={2}
              strokeDasharray="2 2"
              dot={false}
              name="Simple Degradation"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DegradationChart;
