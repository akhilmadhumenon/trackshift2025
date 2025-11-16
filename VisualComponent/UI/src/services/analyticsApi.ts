/**
 * Analytics API Service
 * Handles all API calls to the F1 Analytics backend service
 */

import { StintAnalysis, LapAnalysis, StintMetrics, DegradationPoint, TelemetryStats, ThermalData } from '../types/analytics';

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generic fetch wrapper with error handling and retry logic
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      // Don't retry on client errors (4xx)
      if (error instanceof Error && error.message.includes('HTTP 4')) {
        throw lastError;
      }

      // If we have retries left, wait and try again
      if (attempt < retries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff
        console.warn(`Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`, lastError);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
}

/**
 * Race information interface
 */
export interface RaceInfo {
  name: string;
  round: number;
  country: string;
  location: string;
  date: string;
}

/**
 * Fetch available races for a given year
 */
export async function fetchRaces(year: number): Promise<RaceInfo[]> {
  const url = `${API_BASE_URL}/api/analytics/races?year=${year}`;
  
  try {
    const data = await fetchWithRetry<{ year: number; races: RaceInfo[] }>(url);
    return data.races;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch races';
    throw new Error(`Unable to load races for ${year}: ${message}`);
  }
}

/**
 * Race data response interface
 */
export interface RaceDataResponse {
  year: number;
  race: string;
  session_type: string;
  drivers: string[];
  laps: any[];
  stints: Record<string, number[]>;
}

/**
 * Fetch race session and laps data
 */
export async function fetchRaceData(year: number, race: string): Promise<RaceDataResponse> {
  const url = `${API_BASE_URL}/api/analytics/race-data?year=${year}&race=${encodeURIComponent(race)}`;
  
  try {
    const data = await fetchWithRetry<RaceDataResponse>(url);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch race data';
    throw new Error(`Unable to load race data for ${race} ${year}: ${message}`);
  }
}

/**
 * Telemetry response interface
 */
export interface TelemetryResponse {
  year: number;
  race: string;
  driver: string;
  stint: number;
  compound: string;
  laps: any[];
  telemetry: any[];
  degradation: {
    fuel_corrections: number[];
    fuel_corrected_times: number[];
    baseline_time: number;
    enhanced_degradation: number[];
    simple_degradation: number[];
  };
  synthetic_sensors: any[];
}

/**
 * Fetch telemetry data for a specific driver and stint
 */
export async function fetchTelemetry(
  year: number,
  race: string,
  driver: string,
  stint: number
): Promise<TelemetryResponse> {
  const url = `${API_BASE_URL}/api/analytics/telemetry?year=${year}&race=${encodeURIComponent(race)}&driver=${encodeURIComponent(driver)}&stint=${stint}`;
  
  try {
    const data = await fetchWithRetry<TelemetryResponse>(url);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch telemetry';
    throw new Error(`Unable to load telemetry for ${driver} stint ${stint}: ${message}`);
  }
}

/**
 * Prediction request interface
 */
export interface PredictionRequest {
  laps: any[];
  telemetry: any[];
  degradation: any;
  synthetic_sensors: any[];
  compound: string;
  stint: number;
}

/**
 * Prediction response interface
 */
export interface PredictionResponse {
  predictions: number[];
  model_version: string;
}

/**
 * Request ML predictions for tyre degradation
 */
export async function predictDegradation(stintData: PredictionRequest): Promise<PredictionResponse> {
  const url = `${API_BASE_URL}/api/analytics/predict`;
  
  try {
    const data = await fetchWithRetry<PredictionResponse>(url, {
      method: 'POST',
      body: JSON.stringify(stintData),
    });
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate predictions';
    throw new Error(`Unable to predict degradation: ${message}`);
  }
}

/**
 * Transform backend telemetry response into StintAnalysis format
 */
export function transformTelemetryToStintAnalysis(
  telemetryData: TelemetryResponse,
  predictions: number[]
): StintAnalysis {
  const laps: LapAnalysis[] = telemetryData.laps.map((lap, index) => {
    const telemetry = telemetryData.telemetry[index] || {};
    const synthetic = telemetryData.synthetic_sensors[index] || {};
    
    return {
      lapNumber: lap.lap_number,
      tyreLife: lap.tyre_life,
      lapTime: lap.lap_time,
      lapTimeFormatted: formatLapTime(lap.lap_time),
      fuelCorrection: telemetryData.degradation.fuel_corrections[index] || 0,
      fuelCorrectedTime: telemetryData.degradation.fuel_corrected_times[index] || lap.lap_time,
      enhancedDegradation: telemetryData.degradation.enhanced_degradation[index] || 0,
      simpleDegradation: telemetryData.degradation.simple_degradation[index] || 0,
      predictedDegradation: predictions[index] || 0,
      telemetry: {
        speedMean: telemetry.speed_mean || 0,
        speedMax: telemetry.speed_max || 0,
        speedStd: telemetry.speed_std || 0,
        rpmMean: telemetry.rpm_mean || 0,
        rpmMax: telemetry.rpm_max || 0,
        throttleMean: telemetry.throttle_mean || 0,
        throttleMax: telemetry.throttle_max || 0,
        throttleStd: telemetry.throttle_std || 0,
        nGearMean: telemetry.n_gear_mean || 0,
        nGearMax: telemetry.n_gear_max || 0,
        brakePercent: telemetry.brake_percent || 0,
        brakeCount: telemetry.brake_count || 0,
      },
      synthetic: {
        tyreTempFL: synthetic.tyre_temp_fl || 0,
        tyreTempFR: synthetic.tyre_temp_fr || 0,
        tyreTempRL: synthetic.tyre_temp_rl || 0,
        tyreTempRR: synthetic.tyre_temp_rr || 0,
        tyrePressureFL: synthetic.tyre_pressure_fl || 0,
        tyrePressureFR: synthetic.tyre_pressure_fr || 0,
        tyrePressureRL: synthetic.tyre_pressure_rl || 0,
        tyrePressureRR: synthetic.tyre_pressure_rr || 0,
        brakeTempFL: synthetic.brake_temp_fl || 0,
        brakeTempFR: synthetic.brake_temp_fr || 0,
        brakeTempRL: synthetic.brake_temp_rl || 0,
        brakeTempRR: synthetic.brake_temp_rr || 0,
        iceTemperature: synthetic.ice_temperature || 0,
        oilTemp: synthetic.oil_temp || 0,
        coolantTemp: synthetic.coolant_temp || 0,
        mguhTemp: synthetic.mguh_temp || 0,
        mgukTemp: synthetic.mguk_temp || 0,
        ersDeploymentRatio: synthetic.ers_deployment_ratio || 0,
        batterySoc: synthetic.battery_soc || 0,
        sidepodTempLeft: synthetic.sidepod_temp_left || 0,
        sidepodTempRight: synthetic.sidepod_temp_right || 0,
        floorTemp: synthetic.floor_temp || 0,
        brakeDuctTemp: synthetic.brake_duct_temp || 0,
        lateralGLoad: synthetic.lateral_g_load || 0,
        longitudinalGLoad: synthetic.longitudinal_g_load || 0,
        tyreWearIndex: synthetic.tyre_wear_index || 0,
      },
    };
  });

  // Calculate metrics
  const avgDegradation = laps.reduce((sum, lap) => sum + lap.enhancedDegradation, 0) / laps.length;
  const maxDegradation = Math.max(...laps.map(lap => lap.enhancedDegradation));
  const totalFuelEffect = laps[laps.length - 1]?.fuelCorrection || 0;
  
  // Find optimal pit lap (when degradation exceeds 2.0s threshold)
  const optimalPitLap = laps.find(lap => lap.predictedDegradation > 2.0)?.lapNumber || laps[laps.length - 1]?.lapNumber || 0;

  const metrics: StintMetrics = {
    compound: telemetryData.compound,
    stintLength: laps.length,
    avgDegradation,
    maxDegradation,
    totalFuelEffect,
    optimalPitLap,
  };

  // Build degradation curve
  const degradationCurve: DegradationPoint[] = laps.map(lap => ({
    tyreLife: lap.tyreLife,
    actual: lap.enhancedDegradation,
    predicted: lap.predictedDegradation,
    simple: lap.simpleDegradation,
    fuelCorrection: lap.fuelCorrection,
  }));

  // Build telemetry stats
  const telemetry: TelemetryStats[] = laps.map(lap => ({
    tyreLife: lap.tyreLife,
    speedMean: lap.telemetry.speedMean,
    throttleMean: lap.telemetry.throttleMean,
    brakePercent: lap.telemetry.brakePercent,
    rpmMean: lap.telemetry.rpmMean,
  }));

  // Build thermal data
  const thermal: ThermalData[] = laps.map(lap => ({
    tyreLife: lap.tyreLife,
    tyreTempFL: lap.synthetic.tyreTempFL,
    tyreTempFR: lap.synthetic.tyreTempFR,
    tyreTempRL: lap.synthetic.tyreTempRL,
    tyreTempRR: lap.synthetic.tyreTempRR,
    brakeTempFL: lap.synthetic.brakeTempFL,
    brakeTempFR: lap.synthetic.brakeTempFR,
    brakeTempRL: lap.synthetic.brakeTempRL,
    brakeTempRR: lap.synthetic.brakeTempRR,
    ersDeploymentRatio: lap.synthetic.ersDeploymentRatio,
    batterySoc: lap.synthetic.batterySoc,
    iceTemperature: lap.synthetic.iceTemperature,
    oilTemp: lap.synthetic.oilTemp,
    coolantTemp: lap.synthetic.coolantTemp,
    mguhTemp: lap.synthetic.mguhTemp,
    mgukTemp: lap.synthetic.mgukTemp,
  }));

  return {
    stintNumber: telemetryData.stint,
    compound: telemetryData.compound,
    laps,
    metrics,
    degradationCurve,
    telemetry,
    thermal,
  };
}

/**
 * Format lap time in seconds to MM:SS.mmm format
 */
function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
}
