import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { DegradationPoint } from '../../../types/analytics';

interface FuelImpactChartProps {
  data: DegradationPoint[];
}

const FuelImpactChart: React.FC<FuelImpactChartProps> = ({ data }) => {
  // Calculate total fuel advantage and estimated fuel burned
  const totalFuelAdvantage = data.length > 0 
    ? data[data.length - 1].fuelCorrection 
    : 0;
  const estimatedFuelBurned = data.length * 1.8; // kg

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const tyreLife = payload[0].payload.tyreLife;
      const correction = payload[0].value;
      return (
        <div className="bg-ferrari-graphite border border-ferrari-red p-3 rounded shadow-lg">
          <p className="text-ferrari-white font-semibold mb-1">
            Lap {tyreLife}
          </p>
          <p className="text-cyan-400 text-sm">
            Fuel Correction: +{correction.toFixed(3)}s
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer for bars
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="#87CEEB"
        textAnchor="middle"
        fontSize={10}
      >
        {value.toFixed(2)}
      </text>
    );
  };

  return (
    <div className="w-full h-full bg-ferrari-black p-2 sm:p-4">
      <div className="mb-4">
        <h3 className="text-ferrari-white text-lg sm:text-xl font-semibold">
          Fuel Load Impact Analysis
        </h3>
        <p className="text-ferrari-white/70 text-xs sm:text-sm mb-4">
          How fuel load reduction affects lap times throughout the stint
        </p>
        
        {/* Explanatory text */}
        <div className="bg-ferrari-graphite p-3 sm:p-4 rounded mb-4 text-xs sm:text-sm text-ferrari-white/80">
          <p className="mb-2">
            <strong>Fuel Load Effects:</strong> F1 cars start with ~110kg of fuel and burn ~1.6-2kg per lap.
          </p>
          <p className="mb-2">
            Each lap, the car becomes lighter, improving lap times by approximately <strong>0.035 seconds per lap</strong>.
          </p>
          <p>
            This chart shows the cumulative fuel correction applied to each lap to account for this effect.
          </p>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div className="bg-ferrari-graphite p-3 rounded">
            <p className="text-ferrari-white/70 text-xs mb-1">Total Fuel Advantage</p>
            <p className="text-ferrari-red text-2xl font-bold">
              +{totalFuelAdvantage.toFixed(3)}s
            </p>
          </div>
          <div className="bg-ferrari-graphite p-3 rounded">
            <p className="text-ferrari-white/70 text-xs mb-1">Estimated Fuel Burned</p>
            <p className="text-ferrari-red text-2xl font-bold">
              {estimatedFuelBurned.toFixed(1)} kg
            </p>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={350} minWidth={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
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
              value: 'Fuel Correction (seconds)',
              angle: -90,
              position: 'insideLeft',
              fill: '#F5F5F5',
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Light blue bars with value labels */}
          <Bar dataKey="fuelCorrection" fill="#87CEEB">
            <LabelList content={renderCustomLabel} />
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill="#87CEEB" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FuelImpactChart;
