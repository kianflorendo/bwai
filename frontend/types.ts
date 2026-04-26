export interface TelemetryData {
  temperature: number; // Celsius
  humidity: number;    // Percentage
  heatIndex: number;   // Calculated perceived temperature
  timestamp: number;
}

export type AlertLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface AiSuggestion {
  text: string;
  timestamp: number;
  level: AlertLevel;
}
