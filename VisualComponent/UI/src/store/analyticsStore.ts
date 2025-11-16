import { create } from 'zustand';
import { StintAnalysis } from '../types/analytics';
import {
  fetchRaces,
  fetchRaceData,
  fetchTelemetry,
  predictDegradation,
  transformTelemetryToStintAnalysis,
  RaceInfo,
  RaceDataResponse,
} from '../services/analyticsApi';

interface AnalyticsState {
  // Configuration
  selectedYear: number;
  selectedRace: string;
  selectedDriver: string | null;
  selectedStint: number | null;
  
  // Data
  availableRaces: RaceInfo[];
  raceSession: RaceDataResponse | null;
  availableDrivers: string[];
  availableStints: number[];
  stintData: StintAnalysis | null;
  
  // UI State
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  showSimpleDegradation: boolean;
  showFuelImpact: boolean;
  
  // Actions
  setConfiguration: (year: number, race: string) => void;
  loadAvailableRaces: (year: number) => Promise<void>;
  loadRaceData: () => Promise<void>;
  setDriver: (driver: string) => void;
  setStint: (stint: number) => Promise<void>;
  analyzeStint: () => Promise<void>;
  toggleVisualizationOption: (option: 'simpleDegradation' | 'fuelImpact') => void;
  resetAnalytics: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // Initial Configuration State
  selectedYear: 2024,
  selectedRace: '',
  selectedDriver: null,
  selectedStint: null,
  
  // Initial Data State
  availableRaces: [],
  raceSession: null,
  availableDrivers: [],
  availableStints: [],
  stintData: null,
  
  // Initial UI State
  isLoading: false,
  loadingMessage: '',
  error: null,
  showSimpleDegradation: false,
  showFuelImpact: true,
  
  // Actions
  setConfiguration: (year: number, race: string) => {
    set({
      selectedYear: year,
      selectedRace: race,
      // Reset dependent state
      selectedDriver: null,
      selectedStint: null,
      availableDrivers: [],
      availableStints: [],
      raceSession: null,
      stintData: null,
      error: null,
    });
  },
  
  loadAvailableRaces: async (year: number) => {
    set({ 
      isLoading: true, 
      loadingMessage: 'Loading available races...', 
      error: null 
    });
    
    try {
      const races = await fetchRaces(year);
      set({
        availableRaces: races,
        isLoading: false,
        loadingMessage: '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load available races';
      
      set({
        error: errorMessage,
        isLoading: false,
        loadingMessage: '',
        availableRaces: [],
      });
    }
  },
  
  loadRaceData: async () => {
    const { selectedYear, selectedRace } = get();
    
    if (!selectedRace) {
      set({ error: 'Please select a race' });
      return;
    }
    
    set({ 
      isLoading: true, 
      loadingMessage: 'Loading race data...', 
      error: null,
      // Reset dependent state
      selectedDriver: null,
      selectedStint: null,
      availableDrivers: [],
      availableStints: [],
      stintData: null,
    });
    
    try {
      const raceData = await fetchRaceData(selectedYear, selectedRace);
      
      set({
        raceSession: raceData,
        availableDrivers: raceData.drivers || [],
        isLoading: false,
        loadingMessage: '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load race data';
      
      set({
        error: errorMessage,
        isLoading: false,
        loadingMessage: '',
      });
    }
  },
  
  setDriver: (driver: string) => {
    const { raceSession } = get();
    
    // Get available stints for this driver
    const stints = raceSession?.stints?.[driver] || [];
    
    set({
      selectedDriver: driver,
      availableStints: stints,
      // Reset stint selection when driver changes
      selectedStint: null,
      stintData: null,
    });
  },
  
  setStint: async (stint: number) => {
    set({
      selectedStint: stint,
      // Clear previous stint data
      stintData: null,
    });
    
    // Automatically trigger stint analysis
    await get().analyzeStint();
  },
  
  analyzeStint: async () => {
    const { selectedYear, selectedRace, selectedDriver, selectedStint } = get();
    
    if (!selectedDriver || selectedStint === null) {
      set({ error: 'Please select a driver and stint' });
      return;
    }
    
    set({ 
      isLoading: true, 
      loadingMessage: 'Extracting telemetry data...', 
      error: null 
    });
    
    try {
      // Step 1: Fetch telemetry and degradation data
      const telemetryData = await fetchTelemetry(
        selectedYear,
        selectedRace,
        selectedDriver,
        selectedStint
      );
      
      set({ loadingMessage: 'Generating ML predictions...' });
      
      // Step 2: Get ML predictions
      const predictionRequest = {
        laps: telemetryData.laps,
        telemetry: telemetryData.telemetry,
        degradation: telemetryData.degradation,
        synthetic_sensors: telemetryData.synthetic_sensors,
        compound: telemetryData.compound,
        stint: telemetryData.stint,
      };
      
      const predictionResponse = await predictDegradation(predictionRequest);
      
      set({ loadingMessage: 'Processing analysis...' });
      
      // Step 3: Transform data into StintAnalysis format
      const stintAnalysis = transformTelemetryToStintAnalysis(
        telemetryData,
        predictionResponse.predictions
      );
      
      set({
        stintData: stintAnalysis,
        isLoading: false,
        loadingMessage: '',
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to analyze stint';
      
      set({
        error: errorMessage,
        isLoading: false,
        loadingMessage: '',
      });
    }
  },
  
  toggleVisualizationOption: (option: 'simpleDegradation' | 'fuelImpact') => {
    if (option === 'simpleDegradation') {
      set(state => ({ showSimpleDegradation: !state.showSimpleDegradation }));
    } else if (option === 'fuelImpact') {
      set(state => ({ showFuelImpact: !state.showFuelImpact }));
    }
  },
  
  resetAnalytics: () => {
    set({
      selectedYear: 2024,
      selectedRace: '',
      selectedDriver: null,
      selectedStint: null,
      availableRaces: [],
      raceSession: null,
      availableDrivers: [],
      availableStints: [],
      stintData: null,
      isLoading: false,
      loadingMessage: '',
      error: null,
      showSimpleDegradation: false,
      showFuelImpact: true,
    });
  },
}));
