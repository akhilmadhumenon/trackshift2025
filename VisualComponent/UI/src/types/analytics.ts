// Analytics Data Types

export interface StintAnalysis {
  stintNumber: number;
  compound: string;
  laps: LapAnalysis[];
  metrics: StintMetrics;
  degradationCurve: DegradationPoint[];
  telemetry: TelemetryStats[];
  thermal: ThermalData[];
}

export interface LapAnalysis {
  lapNumber: number;
  tyreLife: number;
  lapTime: number; // seconds
  lapTimeFormatted: string;
  fuelCorrection: number;
  fuelCorrectedTime: number;
  enhancedDegradation: number;
  simpleDegradation: number;
  predictedDegradation: number;
  telemetry: LapTelemetry;
  synthetic: SyntheticSensorData;
}

export interface StintMetrics {
  compound: string;
  stintLength: number;
  avgDegradation: number;
  maxDegradation: number;
  totalFuelEffect: number;
  optimalPitLap: number;
}

export interface DegradationPoint {
  tyreLife: number;
  actual: number;
  predicted: number;
  simple: number;
  fuelCorrection: number;
}

export interface LapTelemetry {
  speedMean: number;
  speedMax: number;
  speedStd: number;
  rpmMean: number;
  rpmMax: number;
  throttleMean: number;
  throttleMax: number;
  throttleStd: number;
  nGearMean: number;
  nGearMax: number;
  brakePercent: number;
  brakeCount: number;
}

export interface SyntheticSensorData {
  tyreTempFL: number;
  tyreTempFR: number;
  tyreTempRL: number;
  tyreTempRR: number;
  tyrePressureFL: number;
  tyrePressureFR: number;
  tyrePressureRL: number;
  tyrePressureRR: number;
  brakeTempFL: number;
  brakeTempFR: number;
  brakeTempRL: number;
  brakeTempRR: number;
  iceTemperature: number;
  oilTemp: number;
  coolantTemp: number;
  mguhTemp: number;
  mgukTemp: number;
  ersDeploymentRatio: number;
  batterySoc: number;
  sidepodTempLeft: number;
  sidepodTempRight: number;
  floorTemp: number;
  brakeDuctTemp: number;
  lateralGLoad: number;
  longitudinalGLoad: number;
  tyreWearIndex: number;
}

export interface ThermalData {
  tyreLife: number;
  tyreTempFL: number;
  tyreTempFR: number;
  tyreTempRL: number;
  tyreTempRR: number;
  brakeTempFL: number;
  brakeTempFR: number;
  brakeTempRL: number;
  brakeTempRR: number;
  ersDeploymentRatio: number;
  batterySoc: number;
  iceTemperature: number;
  oilTemp: number;
  coolantTemp: number;
  mguhTemp: number;
  mgukTemp: number;
}

export interface TelemetryStats {
  tyreLife: number;
  speedMean: number;
  throttleMean: number;
  brakePercent: number;
  rpmMean: number;
}
